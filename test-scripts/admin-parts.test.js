import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPartsPage from "../src/app/admin-parts/page";

jest.mock("../src/app/admin-parts/PartsPage.css", () => ({}));

jest.mock("../src/app/components/Sidebar", () => {
  return function SidebarMock() {
    return <div data-testid="sidebar">Sidebar</div>;
  };
});

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, whileHover, whileTap, transition, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

jest.mock("lucide-react", () => ({
  Pencil: () => <span data-testid="pencil-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
    from: (...args) => mockFrom(...args),
  },
}));

describe("AdminPartsPage", () => {
  let tableData;
  let tableErrors;
  let insertErrors;
  let updateErrors;
  let deleteErrors;
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    tableData = {
      cpus: [{ id: 1, name: "Ryzen 5 5600X", price: 199.99 }],
      gpus: [{ id: 2, name: "RTX 4060", price: 299.99 }],
      motherboards: [],
      memories: [],
      storages: [],
      psus: [],
      cases: [],
      coolings: [],
      operating_systems: [],
      networkings: [],
    };

    tableErrors = {};
    insertErrors = {};
    updateErrors = {};
    deleteErrors = {};

    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1", email: "admin@test.com" } },
      error: null,
    });

    mockFrom.mockImplementation((table) => {
      if (table === "audit_logs") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }

      return {
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({
              data: tableData[table] || [],
              error: tableErrors[table] || null,
            })
          ),
        })),

        insert: jest.fn((payload) => ({
          select: jest.fn(() => {
            if (insertErrors[table]) {
              return Promise.resolve({ data: null, error: insertErrors[table] });
            }
            const inserted = {
              id: (tableData[table]?.length || 0) + 100,
              name: payload.name,
              price: payload.price,
            };
            tableData[table] = [...(tableData[table] || []), inserted];
            return Promise.resolve({ data: [inserted], error: null });
          }),
        })),

        update: jest.fn((payload) => ({
          eq: jest.fn((_field, id) => {
            if (updateErrors[table]) {
              return Promise.resolve({ error: updateErrors[table] });
            }
            tableData[table] = (tableData[table] || []).map((item) =>
              item.id === id ? { ...item, ...payload } : item
            );
            return Promise.resolve({ error: null });
          }),
        })),

        delete: jest.fn(() => ({
          eq: jest.fn((_field, id) => {
            if (deleteErrors[table]) {
              return Promise.resolve({ error: deleteErrors[table] });
            }
            tableData[table] = (tableData[table] || []).filter((item) => item.id !== id);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  const getCategoryScope = async (categoryName) => {
    const heading = await screen.findByText(categoryName);
    const card = heading.closest(".category");
    return within(card);
  };

  test("renders sidebar, page title, categories, and initial part rows", async () => {
    render(<AdminPartsPage />);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /parts/i })).toBeInTheDocument();

    expect(await screen.findByText("Processor (CPU)")).toBeInTheDocument();
    expect(screen.getByText("Graphics Card (GPU)")).toBeInTheDocument();
    expect(screen.getByText("Networking")).toBeInTheDocument();

    expect(await screen.findByText(/Ryzen 5 5600X/i)).toBeInTheDocument();
    expect(screen.getByText(/RTX 4060/i)).toBeInTheDocument();
  });

  test("opens add modal and creates a new item in selected category", async () => {
    const user = userEvent.setup();
    render(<AdminPartsPage />);

    const storageScope = await getCategoryScope("Storage");
    await user.click(storageScope.getByRole("button", { name: /\+ add/i }));

    const modal = await screen.findByText("Add Item");
    const modalScope = within(modal.closest(".modal-content"));

    await user.type(modalScope.getByPlaceholderText(/amd ryzen 3/i), "Samsung 990 Pro");
    await user.type(modalScope.getByPlaceholderText(/e\.g\. 200/i), "179.99");
    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Samsung 990 Pro/i)).toBeInTheDocument();
    });
  });


  test("shows alert and blocks save when item name is empty", async () => {
    const user = userEvent.setup();
    render(<AdminPartsPage />);

    const cpuScope = await getCategoryScope("Processor (CPU)");
    await user.click(cpuScope.getByRole("button", { name: /\+ add/i }));

    const modal = await screen.findByText("Add Item");
    const modalScope = within(modal.closest(".modal-content"));

    await user.type(modalScope.getByPlaceholderText(/e\.g\. 200/i), "123.45");
    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    expect(window.alert).toHaveBeenCalledWith("Please enter an item name.");
  });

  test("edits existing item and updates displayed values", async () => {
    const user = userEvent.setup();
    render(<AdminPartsPage />);

    await user.click(await screen.findByText(/Ryzen 5 5600X/i));

    const modal = await screen.findByText("Edit Item");
    const modalScope = within(modal.closest(".modal-content"));

    const nameInput = modalScope.getByDisplayValue("Ryzen 5 5600X");
    const priceInput = modalScope.getByDisplayValue("199.99");

    await user.clear(nameInput);
    await user.type(nameInput, "Ryzen 5 7600X");

    await user.clear(priceInput);
    await user.type(priceInput, "249.99");

    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ryzen 5 7600X/i)).toBeInTheDocument();
      expect(screen.getByText(/\$249.99/i)).toBeInTheDocument();
    });
  });


  test("delete flow: cancel keeps item, confirm removes item", async () => {
    const user = userEvent.setup();
    render(<AdminPartsPage />);

    const cpuScope = await getCategoryScope("Processor (CPU)");
    await screen.findByText(/Ryzen 5 5600X/i);

    await user.click(cpuScope.getByTitle("Delete"));
    const confirmTitle = await screen.findByText(/confirm removal/i);
    const confirmScope = within(confirmTitle.closest(".modal-content"));

    await user.click(confirmScope.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText(/Ryzen 5 5600X/i)).toBeInTheDocument();

    await user.click(cpuScope.getByTitle("Delete"));
    const confirmTitle2 = await screen.findByText(/confirm removal/i);
    const confirmScope2 = within(confirmTitle2.closest(".modal-content"));

    await user.click(confirmScope2.getByRole("button", { name: /yes, remove/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Ryzen 5 5600X/i)).not.toBeInTheDocument();
    });
  });


  test("Escape key closes both add/edit modal and delete confirmation modal", async () => {
    const user = userEvent.setup();
    render(<AdminPartsPage />);

    const cpuScope = await getCategoryScope("Processor (CPU)");
    await user.click(cpuScope.getByRole("button", { name: /\+ add/i }));
    expect(await screen.findByText("Add Item")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText("Add Item")).not.toBeInTheDocument();
    });

    await user.click(cpuScope.getByTitle("Delete"));
    expect(await screen.findByText(/confirm removal/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText(/confirm removal/i)).not.toBeInTheDocument();
    });
  });

  test("continues rendering when one category fetch fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    tableErrors.storages = { message: "fetch failed" };

    render(<AdminPartsPage />);

    expect(await screen.findByText(/Ryzen 5 5600X/i)).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  test("shows alert when insert fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    insertErrors.storages = { message: "insert failed" };
    render(<AdminPartsPage />);

    const storageScope = await getCategoryScope("Storage");
    await user.click(storageScope.getByRole("button", { name: /\+ add/i }));

    const modal = await screen.findByText("Add Item");
    const modalScope = within(modal.closest(".modal-content"));
    await user.type(modalScope.getByPlaceholderText(/amd ryzen 3/i), "Broken Save Item");
    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Error: insert failed");
    });

    consoleErrorSpy.mockRestore();
  });

  test("shows alert when update fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    updateErrors.cpus = { message: "update failed" };
    render(<AdminPartsPage />);

    await user.click(await screen.findByText(/Ryzen 5 5600X/i));

    const modal = await screen.findByText("Edit Item");
    const modalScope = within(modal.closest(".modal-content"));
    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Error: update failed");
    });

    consoleErrorSpy.mockRestore();
  });

  test("shows alert when delete fails and keeps item", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    deleteErrors.cpus = { message: "delete failed" };
    render(<AdminPartsPage />);

    const cpuScope = await getCategoryScope("Processor (CPU)");
    await screen.findByText(/Ryzen 5 5600X/i);

    await user.click(cpuScope.getByTitle("Delete"));
    const confirmTitle = await screen.findByText(/confirm removal/i);
    const confirmScope = within(confirmTitle.closest(".modal-content"));
    await user.click(confirmScope.getByRole("button", { name: /yes, remove/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Error: delete failed");
    });
    expect(screen.getByText(/Ryzen 5 5600X/i)).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
