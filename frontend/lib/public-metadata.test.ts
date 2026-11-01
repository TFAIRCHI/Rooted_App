import {afterEach,expect,it,vi} from "vitest";
import {publicOrigin,publicMetadata} from "./public-metadata";
afterEach(()=>vi.unstubAllEnvs());
it("keeps development and unconfigured or invalid public origins unindexed",()=>{
  vi.stubEnv("NODE_ENV","development");vi.stubEnv("ROOTED_PUBLIC_ORIGIN","https://rooted.example.com");expect(publicOrigin()).toBeUndefined();
  vi.stubEnv("NODE_ENV","production");
  for(const origin of ["","http://rooted.example.com","https://127.0.0.2","https://192.168.1.1","https://[::1]","https://church.localhost","https://rooted.example.com/c/private","https://user:password@rooted.example.com","https://rooted.example.com?token=x"]){vi.stubEnv("ROOTED_PUBLIC_ORIGIN",origin);expect(publicOrigin()).toBeUndefined();expect(publicMetadata("Rooted","Description","/").robots).toEqual({index:false,follow:false});}
});
it("uses only an explicitly configured production origin for public canonical metadata",()=>{
  vi.stubEnv("NODE_ENV","production");vi.stubEnv("ROOTED_PUBLIC_ORIGIN","https://rooted.example.com");
  expect(publicOrigin()).toBe("https://rooted.example.com");expect(publicMetadata("Rooted","Description","/get-started").alternates?.canonical).toBe("/get-started");
});
