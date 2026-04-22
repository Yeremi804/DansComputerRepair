import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPartsPage from "../src/app/admin-parts/page";

jest.mock("../src/app/admin-parts/PartsPage.css", () => ({}));

jest.mock("../src/app/components/Sidebar", () => {
  return function Sidebar() {
    return <div>Sidebar</div>;
  };
});

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover, whileTap, ...props }) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, transition, ...props }) => (
      <button {...props}>{children}</button>
    ),
  },
}));

jest.mock("lucide-react", () => ({
  Pencil: () => <span>Pencil</span>,
  Trash2: () => <span>Trash2</span>,
}));

const mockAuditInsert = jest.fn();
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

describe("AdminPartsPage audit log tests", () => {
  let mockTableData;

  beforeEach(() => {
    jest.clearAllMocks();

    window.alert = jest.fn();

    mockTableData = {
      cpus: [{ id: 1, name: "Ryzen 5 5600X", price: 199.99 }],
      gpus: [],
      motherboards: [],
      memories: [],
      storages: [],
      psus: [],
      cases: [],
      coolings: [],
      operating_systems: [],
      networkings: [],
    };

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-123",
          email: "admin@test.com",
        },
      },
      error: null,
    });

    mockAuditInsert.mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table) => {
      if (table === "audit_logs") {
        return {
          insert: mockAuditInsert,
        };
      }

      return {
        select: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({
              data: mockTableData[table] || [],
              error: null,
            })
          ),
        })),

        insert: jest.fn((payload) => ({
          select: jest.fn(() => {
            const inserted = {
              id: 99,
              name: payload.name,
              price: payload.price,
            };

            mockTableData[table] = [...(mockTableData[table] || []), inserted];

            return Promise.resolve({
              data: [inserted],
              error: null,
            });
          }),
        })),

        update: jest.fn((payload) => ({
          eq: jest.fn((field, id) => {
            mockTableData[table] = (mockTableData[table] || []).map((item) =>
              item.id === id
                ? {
                    ...item,
                    name: payload.name,
                    price: payload.price,
                  }
                : item
            );

            return Promise.resolve({ error: null });
          }),
        })),

        delete: jest.fn(() => ({
          eq: jest.fn((field, id) => {
            mockTableData[table] = (mockTableData[table] || []).filter(
              (item) => item.id !== id
            );

            return Promise.resolve({ error: null });
          }),
        })),
      };
    });
  });

  test("creates PART_CREATED audit log after successful part creation", async () => {
    const user = userEvent.setup();

    render(<AdminPartsPage />);

    const cpuHeading = await screen.findByText("Processor (CPU)");
    const cpuCard = cpuHeading.closest(".category");
    const cpuScope = within(cpuCard);

    await user.click(cpuScope.getByRole("button", { name: /\+ add/i }));

    const modal = screen.getByText("Add Item").closest(".modal-content");
    const modalScope = within(modal);

    await user.type(
      modalScope.getByPlaceholderText(/amd ryzen 3/i),
      "Ryzen 7 7700X"
    );
    await user.type(modalScope.getByPlaceholderText(/e\.g\. 200/i), "299.99");

    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockAuditInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "admin-123",
          actor_email: "admin@test.com",
          action: "PART_CREATED",
          entity_type: "cpus",
          entity_id: "99",
          metadata: {
            category: "Processor (CPU)",
            name: "Ryzen 7 7700X",
            price: 299.99,
          },
        }),
      ]);
    });
  });

  test("creates PART_UPDATED audit log after successful part update", async () => {
    const user = userEvent.setup();

    render(<AdminPartsPage />);

    const existingItem = await screen.findByText(/Ryzen 5 5600X/i);
    await user.click(existingItem);

    const modal = screen.getByText("Edit Item").closest(".modal-content");
    const modalScope = within(modal);

    const nameInput = modalScope.getByDisplayValue("Ryzen 5 5600X");
    const priceInput = modalScope.getByDisplayValue("199.99");

    await user.clear(nameInput);
    await user.type(nameInput, "Ryzen 5 7600X");

    await user.clear(priceInput);
    await user.type(priceInput, "249.99");

    await user.click(modalScope.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(mockAuditInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "admin-123",
          actor_email: "admin@test.com",
          action: "PART_UPDATED",
          entity_type: "cpus",
          entity_id: "1",
          metadata: {
            category: "Processor (CPU)",
            name: "Ryzen 5 7600X",
            price: 249.99,
            previous: {
              name: "Ryzen 5 5600X",
              price: "199.99",
            },
          },
        }),
      ]);
    });
  });

  test("creates PART_DELETED audit log after successful part deletion", async () => {
    const user = userEvent.setup();

    render(<AdminPartsPage />);

    const cpuHeading = await screen.findByText("Processor (CPU)");
    const cpuCard = cpuHeading.closest(".category");
    const cpuScope = within(cpuCard);

    await screen.findByText(/Ryzen 5 5600X/i);

    await user.click(cpuScope.getByTitle("Delete"));

    const modal = screen.getByText(/confirm removal/i).closest(".modal-content");
    const modalScope = within(modal);

    await user.click(modalScope.getByRole("button", { name: /yes, remove/i }));

    await waitFor(() => {
      expect(mockAuditInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          actor_user_id: "admin-123",
          actor_email: "admin@test.com",
          action: "PART_DELETED",
          entity_type: "cpus",
          entity_id: "1",
          metadata: {
            category: "Processor (CPU)",
            name: "Ryzen 5 5600X",
            price: "199.99",
          },
        }),
      ]);
    });
  });
});