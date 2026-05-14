import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminTable from "@/components/admin/AdminTable";

describe("AdminTable", () => {
  it("renders empty message once with normal row padding", () => {
    render(
      <AdminTable
        columns="grid-cols-[1fr_120px_44px]"
        headers={[{ label: "A" }, { label: "B" }]}
      >
        {null}
      </AdminTable>,
    );

    const message = screen.getByText("No entries found.");
    expect(message).toBeInTheDocument();
    expect(screen.getAllByText("No entries found.")).toHaveLength(1);
    expect(message).toHaveClass("py-3");
  });

  it("does not render empty message when rows exist", () => {
    render(
      <AdminTable
        columns="grid-cols-[1fr_44px]"
        headers={[{ label: "A" }]}
      >
        <AdminTable.Row columns="grid-cols-[1fr_44px]">
          <AdminTable.Cell>Row</AdminTable.Cell>
          <AdminTable.Cell className="px-2 py-2" />
        </AdminTable.Row>
      </AdminTable>,
    );

    expect(screen.queryByText("No entries found.")).not.toBeInTheDocument();
    expect(screen.getByText("Row")).toBeInTheDocument();
  });

  it("uses full-cell sortable links and active sort indicator", () => {
    render(
      <AdminTable
        columns="grid-cols-[1fr_44px]"
        headers={[{ label: "Created", key: "created_at" }]}
        sort={{ key: "created_at", direction: "desc" }}
        basePath="/admin/usage"
        searchParams={{ range: "1d", sort: "created_at", direction: "desc" }}
      >
        <AdminTable.Row columns="grid-cols-[1fr_44px]">
          <AdminTable.Cell>Row</AdminTable.Cell>
          <AdminTable.Cell className="px-2 py-2" />
        </AdminTable.Row>
      </AdminTable>,
    );

    const headerLink = screen.getByRole("link", { name: /Created/i });
    expect(headerLink).toHaveClass("flex", "h-full", "w-full", "px-3", "py-2.5");
    expect(headerLink.getAttribute("href")).toContain("sort=created_at");
    expect(headerLink.getAttribute("href")).toContain("direction=asc");
  });

  it("clears sort params on third-click state", () => {
    render(
      <AdminTable
        columns="grid-cols-[1fr_44px]"
        headers={[{ label: "Created", key: "created_at" }]}
        sort={{ key: "created_at", direction: "asc" }}
        sortParam="sort"
        directionParam="direction"
        basePath="/admin/usage"
        searchParams={{ range: "7d", sort: "created_at", direction: "asc" }}
      >
        <AdminTable.Row columns="grid-cols-[1fr_44px]">
          <AdminTable.Cell>Row</AdminTable.Cell>
          <AdminTable.Cell className="px-2 py-2" />
        </AdminTable.Row>
      </AdminTable>,
    );

    const headerLink = screen.getByRole("link", { name: /Created/i });
    expect(headerLink.getAttribute("href")).toBe("/admin/usage?range=7d");
  });
});
