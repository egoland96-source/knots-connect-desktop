// tls.go — TLS ClientHello tespiti ve SNI (Server Name Indication) ayrıştırması.
// Python k_tls.py'nin tam Go karşılığıdır.
// parse_real_sni() tabanlı gerçek TLS yapısını takip eden ayrıştırıcı kullanılır.
// Ham byte araması yerine RFC 8446 uyumlu extension traversal yapılır.
package main

import "encoding/binary"

// IsClientHello, TCP payload'ının TLS 1.x ClientHello el sıkışması içerip içermediğini kontrol eder.
// TLS Record Layer: type=0x16 (Handshake), version=0x0301/0x0303, Handshake type=0x01 (ClientHello)
func IsClientHello(payload []byte) bool {
	if len(payload) < 6 {
		return false
	}
	// TLS Handshake record tipi
	if payload[0] != 0x16 {
		return false
	}
	// TLS major version 3 (TLS 1.0/1.1/1.2/1.3 hepsi 0x03 kullanır)
	if payload[1] != 0x03 {
		return false
	}
	// Handshake type: ClientHello = 0x01 (record header'dan 5 bayt sonra)
	if payload[5] != 0x01 {
		return false
	}
	return true
}

// ExtractSNI, TLS ClientHello'dan SNI (server_name extension) değerini ayrıştırır.
// RFC 8446 §4.2.1'e göre tam extension traversal yapılır.
// Boş string döner: SNI bulunamazsa veya paket hatalıysa.
func ExtractSNI(payload []byte) string {
	// TLS Record Header: type(1) + version(2) + length(2) = 5 bayt
	if len(payload) < 43 || payload[0] != 0x16 {
		return ""
	}

	pos := 5

	// Handshake type doğrulama: 0x01 = ClientHello
	if pos >= len(payload) || payload[pos] != 0x01 {
		return ""
	}
	pos++ // handshake type (1 bayt)
	pos += 3 // handshake length (3 bayt)
	pos += 2 // client_version (2 bayt)
	pos += 32 // random (32 bayt)

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

	// Extension traversal: RFC 8446 extension format:
	// ExtensionType (2 bayt) + Length (2 bayt) + Data (Length bayt)
	for pos+4 <= extensionsEnd && pos+4 <= len(payload) {
		extType := binary.BigEndian.Uint16(payload[pos : pos+2])
		extLen := int(binary.BigEndian.Uint16(payload[pos+2 : pos+4]))
		extDataStart := pos + 4

		if extType == 0x0000 { // server_name extension
			// ServerNameList: list_length(2) + name_type(1) + name_length(2) + name
			if extDataStart+5 > len(payload) {
				return ""
			}
			listPos := extDataStart + 2
			if listPos >= len(payload) || payload[listPos] != 0x00 { // 0x00 = host_name type
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

// findApproxSNIOffset, SNI extension'ının yaklaşık byte konumunu tahmin eder.
// Phantom Illusion split noktasını SNI sınırına yakın tutmak için kullanılır.
// Bulamazsa -1 döner.
func findApproxSNIOffset(payload []byte) int {
	// TLS extension bölümünde 0x00 0x00 çiftini 40. bayttan itibaren ara
	for i := 40; i+5 < len(payload); i++ {
		if payload[i] == 0x00 && payload[i+1] == 0x00 {
			return i + 2
		}
	}
	return -1
}
