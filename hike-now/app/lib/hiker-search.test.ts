import { describe, expect, it } from "vitest";
import { hikerName, matchHikers, matchHikes, profileHref } from "./hiker-search";

describe("hikerName", () => {
  it("capitalizes the part of the email before the @", () => {
    expect(hikerName("alex.m@example.com")).toBe("Alex.m");
    expect(hikerName("")).toBe("");
  });

  it("prefers a chosen display name and ignores blank ones", () => {
    expect(hikerName("alex@example.com", "  Alex Summit ")).toBe("Alex Summit");
    expect(hikerName("alex@example.com", "   ")).toBe("Alex");
    expect(hikerName("alex@example.com", null)).toBe("Alex");
  });
});

describe("profileHref", () => {
  it("points to the profile page", () => {
    expect(profileHref("abc")).toBe("/profile/abc");
  });
});

describe("matchHikers", () => {
  const hikers = [
    { id: "1", email: "zoe@example.com", description: "Loves Banff" },
    { id: "2", email: "alex@example.com", description: null },
    { id: "3", email: "alexandra@example.com", description: "Trail runner" },
  ];

  it("matches the public name, ignoring case and spaces, sorted by email", () => {
    expect(matchHikers(hikers, "  ALEX ").map((h) => h.id)).toEqual(["2", "3"]);
  });

  it("matches the description", () => {
    expect(matchHikers(hikers, "banff").map((h) => h.id)).toEqual(["1"]);
  });

  it("does not search the email domain", () => {
    expect(matchHikers(hikers, "example")).toEqual([]);
  });

  it("returns nothing for an empty query", () => {
    expect(matchHikers(hikers, "   ")).toEqual([]);
  });
});

describe("matchHikes", () => {
  const hikes = [
    { id: "a", name: "Old Fort Point", location: "Jasper" },
    { id: "b", name: "Cory Pass", location: "Banff" },
  ];

  it("matches by name or location", () => {
    expect(matchHikes(hikes, "pass").map((h) => h.id)).toEqual(["b"]);
    expect(matchHikes(hikes, "jasper").map((h) => h.id)).toEqual(["a"]);
  });

  it("returns nothing when empty or without matches", () => {
    expect(matchHikes(hikes, "")).toEqual([]);
    expect(matchHikes(hikes, "zzz")).toEqual([]);
  });
});
