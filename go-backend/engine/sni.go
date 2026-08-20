// sni.go — engine içi SNI ayrıştırma (main paketindeki ExtractSNI'nin
// motor-kendi kendine yeten kopyası; import döngüsü yaratmamak için burada).
package engine

import "encoding/binary"

// ExtractSNI, TLS ClientHello'dan SNI (server_name extension) değerini ayrıştırır.
// RFC 8446 §4.2.1'e göre tam extension traversal yapılır.
// Boş string döner: SNI bulunamazsa veya paket hatalıysa.
func ExtractSNI(payload []byte) string {
	if len(payload) < 43 || payload[0] != 0x16 {
		return ""
	}

	pos := 5

	// Handshake type doğrulama: 0x01 = ClientHello
	if pos >= len(payload) || payload[pos] != 0x01 {
		return ""
	}
	pos++
	pos += 3 // handshake length
	pos += 2 // client_version
	pos += 32 // random

	if pos >= len(payload) {
		return ""
	}

	// Session ID
	sessionIDLen := int(payload[pos])
	pos += 1 + sessionIDLen
	if pos+2 > len(payload) {
		return ""
	}

	// Cipher Suites
	cipherSuitesLen := int(binary.BigEndian.Uint16(payload[pos : pos+2]))
	pos += 2 + cipherSuitesLen
	if pos >= len(payload) {
		return ""
	}

	// Compression Methods
	compressionLen := int(payload[pos])
	pos += 1 + compressionLen
	if pos+2 > len(payload) {
		return ""
	}

	// Extensions
	extensionsLen := int(binary.BigEndian.Uint16(payload[pos : pos+2]))
	pos += 2
	extensionsEnd := pos + extensionsLen

	for pos+4 <= extensionsEnd && pos+4 <= len(payload) {
		extType := binary.BigEndian.Uint16(payload[pos : pos+2])
		extLen := int(binary.BigEndian.Uint16(payload[pos+2 : pos+4]))
		extDataStart := pos + 4

		if extType == 0x0000 { // server_name extension
			if extDataStart+5 > len(payload) {
				return ""
			}
			listPos := extDataStart + 2
			if listPos >= len(payload) || payload[listPos] != 0x00 {
				return ""
			}
			if listPos+3 > len(payload) {
				return ""
			}
			nameLen := int(binary.BigEndian.Uint16(payload[listPos+1 : listPos+3]))
			nameStart := listPos + 3
			if nameStart+nameLen > len(payload) {
				return ""
			}
			return string(payload[nameStart : nameStart+nameLen])
		}

		pos = extDataStart + extLen
	}

	return ""
}

// clientHelloSNI, ham IPv4/TCP paketinden ClientHello SNI'sini çıkarır.
func clientHelloSNI(raw []byte) string {
	if len(raw) < 40 {
		return ""
	}
	ihl := int(raw[0]&0x0F) * 4
	if ihl+12 > len(raw) {
		return ""
	}
	thl := int(raw[ihl+12]>>4&0x0F) * 4
	if ihl+thl+5 > len(raw) {
		return ""
	}
	return ExtractSNI(raw[ihl+thl:])
}