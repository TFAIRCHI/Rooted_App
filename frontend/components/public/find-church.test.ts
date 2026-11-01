import { describe, it, expect } from "vitest";
import { churchPath } from "./find-church";
describe("public church link navigation",()=>{
  it("accepts church slugs and same-origin church links without fetching them",()=>{
    expect(churchPath("grace","https://rooted.example")).toBe("/c/grace");
    expect(churchPath("https://rooted.example/c/grace/","https://rooted.example")).toBe("/c/grace");
  });
  it("rejects external, private API and token-bearing destinations",()=>{
    for(const input of ["https://other.example/c/grace","//evil.example/c/grace","javascript:alert(1)","/api/v1/churches","/c/grace?token=secret","/c/grace#secret","/c/%67race"]) expect(churchPath(input,"https://rooted.example")).toBeNull();
  });
});
