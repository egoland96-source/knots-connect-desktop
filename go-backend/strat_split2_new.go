//go:build ignore

package main

import (
	"encoding/binary"
	"fmt"
	"os"
	"strings"
	"time"

	"knots-go-backend/engine"
)

var globalVideoSkips = []string{"msftconnecttest.com", "dns.msftconnecttest.com"}

func globalSkipMatch(sni string) bool {
	sni = strings.ToLower(sni)
	for _, s := range globalVideoSkips {
		if sni == s || strings.HasSuffix(sni, "."+s) {
			return true
		}
	}
	return false
}

type Split2Strategy struct {
	blacklist []string
	mode      int
	force     bool
}

func NewSplit2Strategy(blacklist []string, mode int) *Split2Strategy {
	return &Split2Strategy{blacklist: blacklist, mode: mode}
}

func (s *Split2Strategy) SetForceAll(v bool) { s.force = v }

func (s *Split2Strategy) Metadata() engine.StrategyMeta {
	return engine.StrategyMeta{ID: "split2", Name: "Global Split", Protocols: []int{6}, IPVersions: []int{4}, RiskLevel: 2}
}

func (s *Split2Strategy) Apply(raw, addr []byte, send engine.SendFunc) (bool, error) {
	ver := raw[0] >> 4
	if ver != 4 && ver != 6 {
		return false, nil
	}
	ipHdrLen, tcpHdrLen, payload, ok := tcpPayload(raw)
	if !ok {
		return false, nil
	}

	sni := ""
	if len(payload) >= 5 && payload[0] == 0x16 && payload[1] == 0x03 && len(payload) > 5 && payload[5] == 0x01 {
		sni = ExtractSNI(payload)
	}

	fmt.Fprintf(os.Stderr, "[DEBUG] bypass uygulanacak: domain=%s payload_len=%d ip_hdr=%d tcp_hdr=%d\n", sni, len(payload), ipHdrLen, tcpHdrLen)

	if s.force && globalSkipMatch(sni) {
		fmt.Fprintf(os.Stderr, "[go-engine] global skip: %s -> passthrough\n", sni)
		return false, nil
	}

	if len(payload) < 1 {
		fmt.Fprintf(os.Stderr, "[DEBUG] bypass RED: payload bos (%d)\n", len(payload))
		return false, nil
	}

	fmt.Fprintf(os.Stderr, "[go-engine] SNI bolunuyor (global): %s -> %d parca (mode %d)\n", sni, 1, s.mode)
	s.sendFragmented(raw, addr, ipHdrLen, tcpHdrLen, payload, send)
	return true, nil
}

func (s *Split2Strategy) sendFragmented(raw, addr []byte, ipHdrLen, tcpHdrLen int, payload []byte, send engine.SendFunc) {
	splitAt := chooseSplitPoint(payload)
	seqNum := binary.BigEndian.Uint32(raw[ipHdrLen+4 : ipHdrLen+8])
	delay := splitDelay
	if s.force {
		delay = time.Millisecond
	}
	sendFragments(raw, addr, ipHdrLen, tcpHdrLen, payload, splitAt, seqNum, delay, send)
}

const splitDelay = 15 * time.Millisecond

func sendRawStrat(raw, addr []byte, send engine.SendFunc) {
	if send == nil {
		return
	}
	if err := send(raw, addr); err != nil {
		fmt.Fprintf(os.Stderr, "[go-engine] Gonderim hatasi: %v\n", err)
	}
}
