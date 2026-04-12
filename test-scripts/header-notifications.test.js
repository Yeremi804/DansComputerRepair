import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../src/app/components/Header";

// Shared mocks
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();

const mockGetUser = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignOut = jest.fn();

const mockRemoveChannel = jest.fn();

let mockPathname = "/dashboard";
let mockProfileRole = "admin";
let mockNotifications = [];
let realtimeInsertHandler = null;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  usePathname: () => mockPathname,
}));

// Mock framer-motion
jest.mock("framer-motion", () => {
  const React = require("react");

  const passthrough =
    (Tag) =>
    ({ children, whileHover: _whileHover, whileTap: _whileTap, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }) =>
      React.createElement(Tag, props, children);

  return {
    motion: {
      button: passthrough("button"),
      div: passthrough("div"),
      span: passthrough("span"),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

// Mock lucide-react icons
jest.mock("lucide-react", () => {
  const React = require("react");

  const makeIcon = (name) =>
    function Icon(props) {
      return <svg data-testid={name} {...props} />;
    };

  return {
    Bell: makeIcon("bell-icon"),
    ChevronDown: makeIcon("chevron-down-icon"),
    LayoutDashboard: makeIcon("layout-dashboard-icon"),
    LogOut: makeIcon("logout-icon"),
    Settings: makeIcon("settings-icon"),
  };
});

// Mock Supabase browser client
function makeSupabaseMock() {
  return {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signOut: (...args) => mockSignOut(...args),
    },

    from: (table) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { role: mockProfileRole },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "notifications") {
        return {
          select: () => ({
            order: () => ({
              limit: async () => ({
                data: mockNotifications,
                error: null,
              }),
            }),
          }),

          update: (payload) => ({
            eq: (field, id) => ({
              is: async (isField, isValue) => {
                // Simulate marking one unread notification as read
                if (
                  field === "id" &&
                  isField === "read_at" &&
                  isValue === null
                ) {
                  mockNotifications = mockNotifications.map((n) =>
                    n.id === id && !n.read_at
                      ? { ...n, read_at: payload.read_at }
                      : n
                  );
                }

                return { error: null };
              },
            }),

            is: async (field, value) => {
              // Simulate marking all unread notifications as read
              if (field === "read_at" && value === null) {
                mockNotifications = mockNotifications.map((n) =>
                  n.read_at ? n : { ...n, read_at: payload.read_at }
                );
              }

              return { error: null };
            },
          }),
        };
      }

      throw new Error(`Unexpected table requested in test: ${table}`);
    },

    channel: () => {
      const channelObj = {
        on: (_type, _filter, callback) => {
          realtimeInsertHandler = callback;
          return channelObj;
        },
        subscribe: jest.fn(() => channelObj),
      };

      return channelObj;
    },

    removeChannel: (...args) => mockRemoveChannel(...args),
  };
}

jest.mock("../src/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => makeSupabaseMock(),
}));

// Helper functions
function seedLoggedInAdmin() {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: "admin-1",
        email: "goldie@example.com",
        user_metadata: {
          firstName: "Goldie",
          lastName: "Diana",
        },
      },
    },
  });

  mockOnAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });

  mockSignOut.mockResolvedValue({ error: null });
}

async function renderHeader() {
  render(<Header />);

  await waitFor(() => {
    expect(mockGetUser).toHaveBeenCalled();
  });

  await waitFor(() => {
    expect(screen.getAllByLabelText(/notifications/i).length).toBeGreaterThan(0);
  });
}

function getNotificationButtons() {
  return screen.getAllByLabelText(/notifications/i);
}

function getUnreadDots(container) {
  return container.querySelectorAll("span.bg-red-500");
}

// Test suite
describe("Header notification dropdown", () => {
  let playSpy;
  let currentTimeSetter;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPathname = "/dashboard";
    mockProfileRole = "admin";
    mockNotifications = [];
    realtimeInsertHandler = null;

    seedLoggedInAdmin();

    playSpy = jest
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockResolvedValue();

    currentTimeSetter = jest.spyOn(
      window.HTMLMediaElement.prototype,
      "currentTime",
      "set"
    );
  });

  afterEach(() => {
    playSpy.mockRestore();
    currentTimeSetter.mockRestore();
  });

  test("shows a regular bell icon when there are no new notifications", async () => {
    mockNotifications = [
      {
        id: "read-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "New Service Request",
        body: "A new service request was submitted.",
        read_at: "2026-04-08T21:10:00.000Z",
      },
    ];

    const { container } = render(<Header />);

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("bell-icon").length).toBeGreaterThan(0);
    });

    // No unread red dot should be shown
    expect(getUnreadDots(container).length).toBe(0);

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    expect(screen.getAllByText(/all caught up/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no new notifications\./i).length).toBeGreaterThan(0);
  });

  test("shows a red unread indicator when there are new notifications", async () => {
    mockNotifications = [
      {
        id: "unread-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "New Service Request",
        body: "A new service request was submitted.",
        read_at: null,
      },
      {
        id: "read-1",
        created_at: "2026-04-08T20:02:15.000Z",
        type: "contact",
        title: "New Contact Message",
        body: "A new contact form message was submitted.",
        read_at: "2026-04-08T20:30:00.000Z",
      },
    ];

    const { container } = render(<Header />);

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(getUnreadDots(container).length).toBeGreaterThan(0);
    });

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    expect(screen.getAllByText(/1 unread notification/i).length).toBeGreaterThan(0);
  });

  test("plays a sound when a new notification arrives through realtime insert", async () => {
    mockNotifications = [];

    render(<Header />);

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(typeof realtimeInsertHandler).toBe("function");
    });

    await act(async () => {
      realtimeInsertHandler({
        new: {
          id: "new-live-1",
          created_at: "2026-04-08T22:15:00.000Z",
          type: "service_request",
          title: "New Service Request",
          body: "A new service request was submitted.",
          read_at: null,
        },
      });
    });

    expect(currentTimeSetter).toHaveBeenCalledWith(0);
    expect(playSpy).toHaveBeenCalled();
  });

  test("displays both new and past notifications in the dropdown", async () => {
    mockNotifications = [
      {
        id: "unread-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "New Service Request",
        body: "A new service request was submitted.",
        read_at: null,
      },
      {
        id: "read-1",
        created_at: "2026-04-08T20:16:40.000Z",
        type: "contact",
        title: "New Contact Message",
        body: "A new contact form message was submitted.",
        read_at: "2026-04-08T20:30:00.000Z",
      },
    ];

    await renderHeader();

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    expect(screen.getAllByText(/new notifications/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/past notifications/i).length).toBeGreaterThan(0);

    expect(screen.getAllByText(/new service request/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/new contact message/i).length).toBeGreaterThan(0);
  });

  test("shows different notification messages for different submitted form types", async () => {
    mockNotifications = [
      {
        id: "notif-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "New Service Request",
        body: "A new service request was submitted.",
        read_at: null,
      },
      {
        id: "notif-2",
        created_at: "2026-04-08T20:16:40.000Z",
        type: "configuration_form",
        title: "New Computer Configuration",
        body: "A new computer configuration form was submitted.",
        read_at: null,
      },
      {
        id: "notif-3",
        created_at: "2026-04-08T19:10:00.000Z",
        type: "contact",
        title: "New Contact Message",
        body: "A new contact form message was submitted.",
        read_at: "2026-04-08T19:30:00.000Z",
      },
    ];

    await renderHeader();

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    expect(screen.getAllByText(/new service request/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/a new service request was submitted\./i).length
    ).toBeGreaterThan(0);

    expect(screen.getAllByText(/new computer configuration/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/a new computer configuration form was submitted\./i).length
    ).toBeGreaterThan(0);

    expect(screen.getAllByText(/new contact message/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/a new contact form message was submitted\./i).length
    ).toBeGreaterThan(0);
  });

  test("clicking a new notification marks it as read", async () => {
    mockNotifications = [
      {
        id: "unique-unread-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "Unread Service Request Notification",
        body: "Please review this unread service request.",
        read_at: null,
      },
    ];

    await renderHeader();

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    const unreadNotificationButtons = screen.getAllByRole("button", {
      name: /unread service request notification/i,
    });

    await userEvent.click(unreadNotificationButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/all caught up/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/no new notifications\./i).length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByText(/unread service request notification/i).length
    ).toBeGreaterThan(0);
  });

  test("Mark All as Read marks all unread notifications as read", async () => {
    mockNotifications = [
      {
        id: "unread-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "Unread One",
        body: "Unread body one.",
        read_at: null,
      },
      {
        id: "unread-2",
        created_at: "2026-04-08T21:10:00.000Z",
        type: "contact",
        title: "Unread Two",
        body: "Unread body two.",
        read_at: null,
      },
    ];

    await renderHeader();

    const bellButtons = getNotificationButtons();
    await userEvent.click(bellButtons[0]);

    const markAllButtons = screen.getAllByRole("button", {
      name: /mark all as read/i,
    });

    await userEvent.click(markAllButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText(/all caught up/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/no new notifications\./i).length).toBeGreaterThan(0);
  });

  test("notification controls render for both desktop and mobile markup paths", async () => {
    mockNotifications = [
      {
        id: "unread-1",
        created_at: "2026-04-08T21:02:15.000Z",
        type: "service_request",
        title: "New Service Request",
        body: "A new service request was submitted.",
        read_at: null,
      },
    ];

    await renderHeader();

    const notificationButtons = screen.getAllByLabelText(/notifications/i);
    expect(notificationButtons.length).toBeGreaterThanOrEqual(2);

    await userEvent.click(notificationButtons[0]);

    expect(screen.getAllByText(/notifications/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/new notifications/i).length).toBeGreaterThan(0);
  });

  test("does not show the notification bell for non-admin users", async () => {
    mockProfileRole = "customer";
    mockNotifications = [];

    render(<Header />);

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText(/notifications/i)).not.toBeInTheDocument();
    });
  });

  test("does not show the notification bell outside admin pages", async () => {
    mockPathname = "/faq";
    mockNotifications = [];

    render(<Header />);

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByLabelText(/notifications/i)).not.toBeInTheDocument();
    });
  });
});