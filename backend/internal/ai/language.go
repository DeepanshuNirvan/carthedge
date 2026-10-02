package ai

import (
	"strings"
	"unicode"
)

// Indian scripts a buyer may type in, and how the reply must be written.
var scripts = []struct {
	table *unicode.RangeTable
	reply string
}{
	{unicode.Devanagari, "Hindi in Devanagari script (हिंदी), not Roman letters"},
	{unicode.Bengali, "Bengali in Bengali script"},
	{unicode.Gurmukhi, "Punjabi in Gurmukhi script"},
	{unicode.Gujarati, "Gujarati in Gujarati script"},
	{unicode.Oriya, "Odia in Odia script"},
	{unicode.Tamil, "Tamil in Tamil script"},
	{unicode.Telugu, "Telugu in Telugu script"},
	{unicode.Kannada, "Kannada in Kannada script"},
	{unicode.Malayalam, "Malayalam in Malayalam script"},
}

// hindiWords are common in romanised Hindi and rare in English chat.
var hindiWords = map[string]bool{}

func init() {
	for _, w := range strings.Fields(`ka ki ke ko hai hain kya kyu kyun chahiye nahi nhi kitne kitna kitni aap aapka
		mujhe muje humko karo karna kar bhi hu hoon hun wala wali wale bhejo bhej milega milegi kab kaise kaisa haan
		theek thik batao bataiye dikhao bhaiya didi accha acha abhi kal aaj kuch koi mera meri mere apna lena dena
		yeh ye woh wo isme usme liye se tak par jaldi paisa paise rupay rupaye kardo krdo karde kariye kijiye dijiye
		chaiye chahie chahiye rehne rahne sakta sakte sakti yehi yahi wahi kam zyada jyada bahut bohot bhut thoda sirf
		ho hoga hogi kaisi kaise kyunki lekin magar matlab bas`) {
		hindiWords[w] = true
	}
}

// englishWords are function words a buyer writing English cannot avoid —
// minus the ones romanised Hindi shares: "kar do", "chahiye the", "phir to".
var englishWords = map[string]bool{}

func init() {
	for _, w := range strings.Fields(`is are does you your can could would what how when where please i my have has
		will it this that of and for with there any am was`) {
		englishWords[w] = true
	}
}

// replyLanguage pins the reply to how the buyer actually writes. Script
// detection is exact where the model is not: left to itself it drifts back to
// Hinglish for a buyer who wrote in English or in Devanagari. Messages with no
// signal (a name, an address, a number) are skipped for the one before them.
func replyLanguage(lines []ChatLine, modelSaid string) string {
	for i, seen := len(lines)-1, 0; i >= 0 && seen < 8; i-- {
		if lines[i].Who != "buyer" {
			continue
		}
		seen++
		if lang := messageLanguage(lines[i].Text); lang != "" {
			return lang
		}
	}
	if modelSaid != "" {
		return modelSaid
	}
	return "English (plain and simple, no Hindi words)"
}

// messageLanguage reads one message; "" means it gives nothing to go on.
func messageLanguage(text string) string {
	for _, s := range scripts {
		for _, r := range text {
			if unicode.Is(s.table, r) {
				return s.reply
			}
		}
	}
	english := 0
	for _, w := range strings.FieldsFunc(strings.ToLower(text), func(r rune) bool { return !unicode.IsLetter(r) }) {
		if hindiWords[w] {
			return "Hinglish (Hindi in Roman script)"
		}
		if englishWords[w] {
			english++
		}
	}
	if english > 0 {
		return "English (plain and simple, no Hindi words)"
	}
	return ""
}
