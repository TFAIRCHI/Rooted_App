"use client";
import {useEffect,useState} from "react";
import {safeContinuation} from "../../backend/src/auth/continuation";
import {PublicSignIn} from "./public/sign-in";
import {PublicFrame} from "./public/frame";

export function LoginScreen({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}) {
  const [returnTo,setReturnTo]=useState("/dashboard");
  useEffect(()=>{setReturnTo(safeContinuation(window.location.pathname+window.location.search)??"/dashboard");},[]);
  if(loading||error) return <PublicFrame><main id="main" className="setup-main"><h1>Welcome to Rooted.</h1>{error?<div role="alert" className="public-error">{error}<button onClick={retry}>Retry connection</button></div>:<p role="status">Checking your session…</p>}</main></PublicFrame>;
  return <PublicSignIn returnTo={returnTo}/>;
}
