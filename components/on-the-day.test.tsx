import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { onTheDayReview } from "@/lib/on-the-day-review";
import { OnTheDay } from "./on-the-day";

it("renders sparse identity and clock without empty optional sections", () => {
  const html = renderToStaticMarkup(<OnTheDay title="Sparse event" schedule={{ items: [], warnings: [] }} reviewNow={Date.parse("2026-10-24T12:00:00Z")}/>);
  expect(html).toContain("Sparse event");
  expect(html).toContain("Review time");
  expect(html).toContain("no timed run sheet");
  expect(html).not.toContain("Hard curfew");
  expect(html).not.toContain("Projected programme finish");
  expect(html).not.toContain("<ol");
});

it.each(["next-start", "accumulated", "curfew-delay"] as const)("renders contextual drift at %s without a permanent disclaimer", (scenario) => {
  const { schedule, now } = onTheDayReview(scenario);
  const html = renderToStaticMarkup(<OnTheDay title="Muster" schedule={schedule} reviewNow={now}/>);
  expect(html).toContain("Likely active");
  expect(html).toContain("Rogue Pony");
  expect(html).toContain("Likely running");
  expect(html).toContain("Projected next");
  expect(html.match(/<li>/g)).toHaveLength(2);
  expect(html).not.toContain("Schedule-based estimate");
  expect(html).not.toContain("Actual progress is unconfirmed");
  if (scenario === "curfew-delay") {
    expect(html).toContain("37");
    expect(html).toContain("min beyond deadline");
  } else expect(html).not.toContain("Hard curfew");
});

it("renders review clock in Perth time regardless of the server timezone", () => {
  const { schedule, now } = onTheDayReview("next-start");
  const html = renderToStaticMarkup(<OnTheDay title="Muster" schedule={schedule} reviewNow={now}/>);
  expect(html).toContain(">20:40</time>");
  expect(html).toContain("AWST");
  expect(html).toContain("Review time");
});
