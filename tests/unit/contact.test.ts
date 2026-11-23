import { describe, expect, test } from "bun:test";
import { instagramLink, telLink, websiteLink, whatsappLink } from "../../src/lib/contact";

describe("contact links", () => {
  test("Algerian local number → international", () => {
    expect(whatsappLink("0555 12 34 56")).toBe("https://wa.me/213555123456");
    expect(telLink("0555 12 34 56")).toBe("tel:+213555123456");
  });
  test("international formats", () => {
    expect(whatsappLink("+213 555 12 34 56")).toBe("https://wa.me/213555123456");
    expect(whatsappLink("00213555123456")).toBe("https://wa.me/213555123456");
  });
  test("prefilled WhatsApp text is encoded", () => {
    expect(whatsappLink("0555123456", "Salam, 3ARSSI")).toBe("https://wa.me/213555123456?text=Salam%2C%203ARSSI");
  });
  test("invalid numbers give no link", () => {
    expect(whatsappLink("12")).toBeNull();
    expect(telLink("")).toBeNull();
  });
  test("instagram handle or URL", () => {
    expect(instagramLink("@studio.nour")).toBe("https://www.instagram.com/studio.nour/");
    expect(instagramLink("https://www.instagram.com/x/")).toBe("https://www.instagram.com/x/");
    expect(instagramLink("https://evil.example/x")).toBeNull();
  });
  test("website", () => {
    expect(websiteLink("example.com")).toBe("https://example.com");
    expect(websiteLink("javascript:alert(1)")).toBeNull();
  });
});
