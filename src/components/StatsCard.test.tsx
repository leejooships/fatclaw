import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatsCard from "./StatsCard";

describe("StatsCard", () => {
  it("renders with zero stats", () => {
    render(<StatsCard linesOfCode={0} characters={0} timeSpent={0} fatness={0} />);
    expect(screen.getByText("Your Vibe Stats")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
    expect(screen.getByText("Slim Claude")).toBeInTheDocument();
  });

  it("shows correct rank for high line count", () => {
    render(<StatsCard linesOfCode={250} characters={5000} timeSpent={120} fatness={0.83} />);
    expect(screen.getByText("SSS")).toBeInTheDocument();
    expect(screen.getByText("SINGULARITY")).toBeInTheDocument();
  });

  it("calculates vibe score correctly", () => {
    render(<StatsCard linesOfCode={100} characters={200} timeSpent={60} fatness={0.5} />);
    // vibeScore = min(9999, floor(100*10 + 200*0.5 + 0.5*1000)) = floor(1000 + 100 + 500) = 1600
    expect(screen.getByText("1,600")).toBeInTheDocument();
  });

  it("formats time correctly", () => {
    render(<StatsCard linesOfCode={0} characters={0} timeSpent={125} fatness={0} />);
    expect(screen.getByText("2m 5s")).toBeInTheDocument();
  });
});
