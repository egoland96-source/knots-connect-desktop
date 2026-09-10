package main

import (
	"encoding/binary"
	"testing"
)

func testIPv4Packet(payloadLen int) (raw []byte, ipHdrLen int) {
	ipHdrLen = 20
	tcpHdrLen := 20
	raw = make([]byte, ipHdrLen+tcpHdrLen+payloadLen)
	raw[0] = 0x45
	raw[8] = 64
	raw[9] = 6
	binary.BigEndian.PutUint16(raw[2:4], uint16(len(raw)))
	raw[ipHdrLen+12] = 0x50 // data offset 5
	return raw, ipHdrLen
}

func TestBuildIPFragmentMFAndOffset(t *testing.T) {
	raw, ipHdrLen := testIPv4Packet(80)
	// DF set on original — must be cleared on fragments.
	binary.BigEndian.PutUint16(raw[6:8], 0x4000)

	frag1 := buildIPFragment(raw, ipHdrLen, ipHdrLen, ipHdrLen+40, 0, true)
	if frag1 == nil {
		t.Fatal("frag1 nil")
	}
	field1 := binary.BigEndian.Uint16(frag1[6:8])
	if field1&ipFragMF == 0 {
		t.Fatalf("frag1 MF unset: 0x%04x", field1)
	}
	if field1&0x4000 != 0 {
		t.Fatalf("frag1 DF still set: 0x%04x", field1)
	}
	if field1&ipFragOffMask != 0 {
		t.Fatalf("frag1 offset want 0 got %d", field1&ipFragOffMask)
	}

	frag2 := buildIPFragment(raw, ipHdrLen, ipHdrLen+40, len(raw), 40/8, false)
	if frag2 == nil {
		t.Fatal("frag2 nil")
	}
	field2 := binary.BigEndian.Uint16(frag2[6:8])
	if field2&ipFragMF != 0 {
		t.Fatalf("frag2 MF set: 0x%04x", field2)
	}
	if field2&ipFragOffMask != 5 {
		t.Fatalf("frag2 offset want 5 got %d", field2&ipFragOffMask)
	}
}

func TestBuildIPFragmentRejectsIPv6(t *testing.T) {
	raw := make([]byte, 80)
	raw[0] = 0x60
	if got := buildIPFragment(raw, 40, 40, 80, 0, true); got != nil {
		t.Fatal("expected nil for IPv6")
	}
}
