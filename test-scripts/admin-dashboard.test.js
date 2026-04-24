import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DashboardPage from "../src/app/dashboard/page";
import OrdersPanel from "../src/app/dashboard/OrdersPanel";

const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockStatsCards = jest.fn();
const mockRefresh = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

jest.mock("../src/app/components/Sidebar", () => {
  const React = require("react");
  return function SidebarMock() {
    return React.createElement("div", { "data-testid": "sidebar" }, "Sidebar");
  };
});

const RealDashboardOrdersPanel = jest.requireActual("../src/app/dashboard/DashboardOrdersPanel").default;

const baseConfigRow = {
  id: 1,
  ID: 1,
  Customer: "Alice",
  Status: "Pending",
  Dates: "2026-04-20T00:00:00Z",
  Notes: "Needs RGB",
  Source: "Configuration_Form",
  phone: "1112223333",
  email: "alice@example.com",
  budget_range: "$1500-$2000",
  intended_use: "Gaming",
  cpu: "Ryzen 7",
  gpu: "RTX 4070",
  memory: "32GB",
  storage: "1TB SSD",
  motherboard: "B650",
  case: "NZXT",
  operating_system: "Windows 11",
  psu: "750W",
  cooling: "AIO",
  networking: "Wi-Fi 6",
  other_requests: "Keep it quiet",
};

const baseServiceRow = {
  id: 50,
  ID: "S-100",
  Customer: "Brenda",
  Status: "Completed",
  Dates: "2026-04-21T00:00:00Z",
  Notes: "Screen flicker",
  Source: "service_requests",
  phone_number: "9998887777",
  email: "brenda@example.com",
  device_type: "Laptop",
  service_type: "Diagnostics",
  problem_start_date: "2026-04-01",
  problem_cause_idea: "After update",
  additional_questions: "Can this be done today?",
};

jest.mock("../src/app/dashboard/DashboardOrdersPanel", () => {
  const React = require("react");
  return function DashboardOrdersPanelMock() {
    return React.createElement("div", { "data-testid": "orders-panel" }, "Orders Panel");
  };
});

jest.mock("../src/app/dashboard/DashboardStatsCards", () => {
  const React = require("react");
  return function DashboardStatsCardsMock(props) {
    mockStatsCards(props);
    return React.createElement(
      "div",
      { "data-testid": "stats-cards" },
      `${props.totalOrder}|${props.ongoingOrders}|${props.completedOrders}`
    );
  };
});

function setSupabaseResults({ configRows = [], configError = null, serviceRows = [], serviceError = null }) {
  mockFrom.mockImplementation((table) => ({
    select: (...args) => {
      mockSelect(table, ...args);
      if (table === "Configuration_Form") {
        return Promise.resolve({ data: configRows, error: configError });
      }
      if (table === "service_requests") {
        return Promise.resolve({ data: serviceRows, error: serviceError });
      }
      return Promise.resolve({ data: [], error: null });
    },
  }));
}

describe("DashboardPage", () => {
  const originalEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  test("renders env var guidance when Supabase variables are missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

    const page = await DashboardPage();
    render(page);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/missing supabase environment variables/i)).toBeInTheDocument();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("aggregates both tables and passes computed counts to stats cards", async () => {
    setSupabaseResults({
      configRows: [
        { id: 1, name: "Alice", Status: "Pending", created_at: "2026-04-18" },
        { id: 2, name: "Bob", Status: "In Progress", created_at: "2026-04-18" },
        { id: 3, name: "Cara", Status: "Completed", created_at: "2026-04-18" },
      ],
      serviceRows: [
        { serial_id: "S-10", customer_name: "Dan", Status: "complete", Create_at: "2026-04-18" },
      ],
    });

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("orders-panel")).toBeInTheDocument();
    expect(screen.getByTestId("stats-cards")).toHaveTextContent("4|1|2");

    expect(mockStatsCards).toHaveBeenCalledWith(
      expect.objectContaining({
        totalOrder: 4,
        ongoingOrders: 1,
        completedOrders: 2,
      })
    );
  });

  test("calculates top cards correctly for mixed status variants", async () => {
    setSupabaseResults({
      configRows: [
        { id: 11, name: "A", Status: "in progress", created_at: "2026-04-18" },
        { id: 12, name: "B", Status: "Completed", created_at: "2026-04-18" },
      ],
      serviceRows: [
        { serial_id: "S-1", customer_name: "C", Status: "IN PROGRESS", Create_at: "2026-04-18" },
        { serial_id: "S-2", customer_name: "D", Status: "complete", Create_at: "2026-04-18" },
        { serial_id: "S-3", customer_name: "E", Status: "Pending", Create_at: "2026-04-18" },
      ],
    });

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId("stats-cards")).toHaveTextContent("5|2|2");
    expect(mockStatsCards).toHaveBeenCalledWith(
      expect.objectContaining({
        totalOrder: 5,
        ongoingOrders: 2,
        completedOrders: 2,
      })
    );
  });

  test("logs query errors and still renders dashboard sections", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setSupabaseResults({
      configRows: [],
      serviceRows: [],
      configError: { message: "Configuration fetch failed" },
      serviceError: { message: "Service fetch failed" },
    });

    const page = await DashboardPage();
    render(page);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByTestId("stats-cards")).toHaveTextContent("0|0|0");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Supabase error (Configuration_Form):",
      expect.objectContaining({ message: "Configuration fetch failed" })
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Supabase error (service_requests):",
      expect.objectContaining({ message: "Service fetch failed" })
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("OrdersPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  test("searches orders and shows empty state when no rows match", async () => {
    const user = userEvent.setup();

    render(
      <OrdersPanel
        rows={[
          baseConfigRow,
          { ...baseServiceRow, Customer: "Charlie", Status: "Pending" },
        ]}
      />
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search orders"), "Alice");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search orders"));
    await user.type(screen.getByPlaceholderText("Search orders"), "not-a-real-order");

    expect(screen.getByText(/no orders match the search/i)).toBeInTheDocument();
  });

  test("sorts by date with newest order first", async () => {
    const user = userEvent.setup();

    render(
      <OrdersPanel
        rows={[
          { ...baseConfigRow, ID: 1, Customer: "Older", Dates: "2026-03-10T00:00:00Z" },
          { ...baseServiceRow, ID: "S-2", Customer: "Newest", Dates: "2026-04-25T00:00:00Z" },
        ]}
      />
    );

    await user.selectOptions(screen.getByLabelText(/sort/i), "date");

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Newest");
    expect(rows[2]).toHaveTextContent("Older");
  });

  test("updates order status via API and refreshes router", async () => {
    const user = userEvent.setup();

    render(<OrdersPanel rows={[baseConfigRow]} />);

    const targetRow = screen.getByText("Alice").closest("tr");
    const statusSelect = within(targetRow).getByDisplayValue("Pending");

    await user.selectOptions(statusSelect, "Completed");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/update-status",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: 1,
            source: "Configuration_Form",
            newStatus: "Completed",
          }),
        })
      );
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  test("expands configuration order details and shows key explanation fields", async () => {
    const user = userEvent.setup();

    render(<OrdersPanel rows={[baseConfigRow]} />);

    await user.click(screen.getByRole("button", { name: "▶" }));

    expect(screen.getByText(/budget range/i)).toBeInTheDocument();
    expect(screen.getByText("$1500-$2000")).toBeInTheDocument();
    expect(screen.getByText(/component specifications/i)).toBeInTheDocument();
    expect(screen.getByText("Ryzen 7")).toBeInTheDocument();
  });

  test("expands service request details and shows customer problem explanation", async () => {
    const user = userEvent.setup();

    render(<OrdersPanel rows={[baseServiceRow]} />);

    await user.click(screen.getByRole("button", { name: "▶" }));

    expect(screen.getByText(/problem description/i)).toBeInTheDocument();
    expect(screen.getByText(/when did the problem start\?/i)).toBeInTheDocument();
    expect(screen.getByText("After update")).toBeInTheDocument();
  });

  test("shows delete action for completed order and triggers delete callback", async () => {
    const user = userEvent.setup();
    const onDeleteOrder = jest.fn();

    render(
      <OrdersPanel
        rows={[
          { ...baseConfigRow, Status: "Pending" },
          { ...baseServiceRow, Status: "Completed" },
        ]}
        onDeleteOrder={onDeleteOrder}
      />
    );

    const deleteButtons = screen.getAllByTitle(/delete order/i);
    expect(deleteButtons).toHaveLength(1);

    await user.click(deleteButtons[0]);

    expect(onDeleteOrder).toHaveBeenCalledWith(expect.objectContaining({
      ID: "S-100",
      Source: "service_requests",
    }));
  });
});

describe("DashboardOrdersPanel", () => {
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let originalBlob;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    window.confirm = jest.fn(() => true);
    window.alert = jest.fn();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalBlob = global.Blob;
    URL.createObjectURL = jest.fn(() => "blob:mock");
    URL.revokeObjectURL = jest.fn();
    global.Blob = jest.fn((parts, options) => ({ parts, options }));

    mockFrom.mockImplementation((table) => {
      if (table === "Configuration_Form") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                ...baseConfigRow,
                name: "Alice",
                created_at: "2026-04-20T00:00:00Z",
                other_requests: "Needs RGB",
              },
            ],
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      if (table === "service_requests") {
        return {
          select: jest.fn().mockResolvedValue({
            data: [
              {
                ...baseServiceRow,
                serial_id: "S-100",
                customer_name: "Brenda",
                Create_at: "2026-04-21T00:00:00Z",
                additional_questions: "Can this be done today?",
              },
            ],
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }

      return {
        select: jest.fn().mockResolvedValue({ data: [] }),
        delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    global.Blob = originalBlob;
  });

  test("deletes a completed order and removes it from UI", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<RealDashboardOrdersPanel />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => expect(screen.getByText("Brenda")).toBeInTheDocument());

    const deleteButton = screen.getAllByTitle(/delete order/i)[0];
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith("Delete order #S-100? This cannot be undone.");
      expect(screen.queryByText("Brenda")).not.toBeInTheDocument();
    });
  });

  test("downloads CSV from filtered configuration orders", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<RealDashboardOrdersPanel />);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const configSection = screen.getByRole("heading", { name: /orders \(configuration form\)/i }).closest("section");
    const csvButton = within(configSection).getByRole("button", { name: /download csv/i });

    await waitFor(() => expect(csvButton).toBeEnabled());
    await user.click(csvButton);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    const blobArg = URL.createObjectURL.mock.calls[0][0];
    const csvText = String(blobArg.parts[0] || "");

    expect(csvText).toContain("ID,Customer,Status,Date,Notes,Source");
    expect(csvText).toContain("\"Alice\"");
    expect(csvText).toContain("\"Configuration_Form\"");

    anchorClickSpy.mockRestore();
  });

});
