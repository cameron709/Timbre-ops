import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { OnTheDay } from "./on-the-day";

it("renders sparse identity and clock without empty optional sections", () => {
  const html = renderToStaticMarkup(<OnTheDay title="Sparse event" schedule={{ items: [], warnings: [] }} reviewNow={Date.parse("2026-10-24T12:00:00Z")}/>);
  expect(html).toContain("Sparse event");
  expect(html).toContain("Device local time");
  expect(html).toContain("no timed run sheet");
  expect(html).not.toContain("Hard curfew");
  expect(html).not.toContain("Projected programme finish");
  expect(html).not.toContain("<ol");
});
