"use client";

import type { ComponentProps } from "react";
import { Studies } from "./studies";
import { GuidedStudyCowriter } from "./guided-study-cowriter";

export function StudiesWithCalendarMove(props: ComponentProps<typeof Studies>) {
  return <><Studies {...props} /><GuidedStudyCowriter key={`${props.session.user.id}:${props.data.church.id}`} data={props.data} session={props.session} /></>;
}
