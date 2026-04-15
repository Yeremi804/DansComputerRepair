/**
 * test-scripts/home-content.test.js
 *
 * Test suite for the Dashboard > Home Content admin page.
 *
 * Coverage:
 *  1. Auth & loading  — loading state, redirect without session, unauthorized user
 *  2. Data loading    — About Us and Footer fields populated from Supabase draft
 *  3. Field editing   — title, body, phone, email inputs are editable
 *  4. Business hours  — add row, remove row, quick-fill, remove disabled on last row
 *  5. Save Draft      — calls update with draft payload, shows success/error messages
 *  6. Publish         — calls update with published payload, shows success/error messages
 *  7. Saving state    — buttons disabled and "Working…" shown while async is in-flight
 *  8. Preview Draft   — correct href and target="_blank" on the link
 *  9. Site reflection — edited values appear in the published payload sent to Supabase
 * 10. Clean hours     — fully empty rows are stripped before saving
 */

import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeContentPage from "../src/app/dashboard/home-content/page";

// ─── Supabase mock fns ────────────────────────────────────────────────────────
// All names must start with "mock" so Jest's hoist allows closure references.
const mockGetSession = jest.fn();
const mockAdminMaybeSingle = jest.fn();
const mockContentIn = jest.fn();
const mockUpdateEq = jest.fn();
const mockRouterPush = jest.fn();
// IMPORTANT: useRouter must return the SAME object reference on every render.
// A new object each render makes React see a changed `router` dependency and
// re-fire useEffect([router]), which re-runs boot() and resets all state.
const mockRouter = { push: (...args) => mockRouterPush(...args) };

jest.mock("../src/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
    },
    from: (table) => {
      if (table === "admins") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => mockAdminMaybeSingle(),
            }),
          }),
        };
      }
      // site_content — handles select (load) and update (save/publish) chains
      return {
        select: () => ({
          in: () => mockContentIn(),
        }),
        update: (payload) => ({
          eq: (...args) => mockUpdateEq(payload, ...args),
        }),
      };
    },
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("../src/app/components/Sidebar", () => {
  const React = require("react");
  return function SidebarMock() {
    return React.createElement("div", { "data-testid": "sidebar" });
  };
});

jest.spyOn(console, "error").mockImplementation(() => {});

// ─── Shared test data ──────────────────────────────────────────────────────────
const VALID_SESSION = { session: { user: { id: "admin-1" } } };
const ADMIN_ROW = { user_id: "admin-1" };
const CONTENT_DATA = [
  {
    key: "home_about",
    draft: { title: "About Us", body: "We fix computers." },
  },
  {
    key: "footer",
    draft: {
      phone: "(916) 320-6955",
      email: "dan@example.com",
      hours: [{ day: "Mon - Sat", open: "7 AM", close: "9 PM" }],
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Renders the page and waits for the loading spinner to disappear. */
async function renderPage() {
  render(<HomeContentPage />);
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  );
}

// ─── Test suite ────────────────────────────────────────────────────────────────
describe("HomeContentPage", () => {
  beforeEach(() => {
    // resetAllMocks clears both call history AND the one-time implementation
    // queue (mockReturnValueOnce), preventing stale queued values from leaking
    // across tests when a prior test exits early (e.g. via timeout).
    jest.resetAllMocks();
    mockGetSession.mockResolvedValue({ data: VALID_SESSION });
    mockAdminMaybeSingle.mockResolvedValue({ data: ADMIN_ROW, error: null });
    mockContentIn.mockResolvedValue({ data: CONTENT_DATA, error: null });
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  // ── 1. Auth & Loading ─────────────────────────────────────────────────────

  test("shows loading indicator before auth resolves", async () => {
    const deferred = createDeferred();
    mockGetSession.mockReturnValueOnce(deferred.promise);

    render(<HomeContentPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    deferred.resolve({ data: VALID_SESSION });

    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    );
  });

  test("redirects to /admin-login when there is no active session", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(<HomeContentPage />);

    await waitFor(() =>
      expect(mockRouterPush).toHaveBeenCalledWith("/admin-login")
    );
  });

  test("shows unauthorized message when user is not in the admins table", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    render(<HomeContentPage />);

    await waitFor(() =>
      expect(
        screen.getByText(/you are not authorized to view this page/i)
      ).toBeInTheDocument()
    );
  });

  test("renders About Us section, Footer section, and action buttons for an authenticated admin", async () => {
    await renderPage();

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByText(/about us \(draft\)/i)).toBeInTheDocument();
    expect(screen.getByText(/footer \(draft\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /preview draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^publish$/i })).toBeInTheDocument();
  });

  // ── 2. Data Loading ───────────────────────────────────────────────────────

  test("populates About Us title and body from loaded draft data", async () => {
    await renderPage();

    expect(screen.getByDisplayValue("About Us")).toBeInTheDocument();
    expect(screen.getByDisplayValue("We fix computers.")).toBeInTheDocument();
  });

  test("populates Footer phone and email from loaded draft data", async () => {
    await renderPage();

    expect(screen.getByDisplayValue("(916) 320-6955")).toBeInTheDocument();
    expect(screen.getByDisplayValue("dan@example.com")).toBeInTheDocument();
  });

  test("populates business hours rows from loaded draft data", async () => {
    await renderPage();

    expect(screen.getByDisplayValue("Mon - Sat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7 AM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9 PM")).toBeInTheDocument();
  });

  test("uses default Mon-Sat 7AM-9PM row when footer.hours is empty", async () => {
    mockContentIn.mockResolvedValueOnce({
      data: [
        { key: "home_about", draft: { title: "", body: "" } },
        { key: "footer", draft: { phone: "", email: "", hours: [] } },
      ],
      error: null,
    });

    await renderPage();

    expect(screen.getByDisplayValue("Mon - Sat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7 AM")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9 PM")).toBeInTheDocument();
  });

  test("shows error message when content fails to load from Supabase", async () => {
    mockContentIn.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    render(<HomeContentPage />);

    await waitFor(() =>
      expect(screen.getByText(/failed to load content/i)).toBeInTheDocument()
    );
  });

  // ── 3. Field Editing ──────────────────────────────────────────────────────

  test("editing About Us title updates the input value", async () => {
    await renderPage();

    const titleInput = screen.getByDisplayValue("About Us");
    fireEvent.change(titleInput, { target: { value: "Who We Are" } });

    expect(titleInput).toHaveValue("Who We Are");
  });

  test("editing About Us body updates the textarea value", async () => {
    await renderPage();

    const bodyTextarea = screen.getByDisplayValue("We fix computers.");
    fireEvent.change(bodyTextarea, { target: { value: "Updated description." } });

    expect(bodyTextarea).toHaveValue("Updated description.");
  });

  test("editing Footer phone updates the input value", async () => {
    await renderPage();

    const phoneInput = screen.getByDisplayValue("(916) 320-6955");
    fireEvent.change(phoneInput, { target: { value: "(555) 555-0001" } });

    expect(phoneInput).toHaveValue("(555) 555-0001");
  });

  test("editing Footer email updates the input value", async () => {
    await renderPage();

    const emailInput = screen.getByDisplayValue("dan@example.com");
    fireEvent.change(emailInput, { target: { value: "new@example.com" } });

    expect(emailInput).toHaveValue("new@example.com");
  });

  // ── 4. Business Hours ─────────────────────────────────────────────────────

  test("Quick fill button resets hours to Mon-Sat 7AM-9PM", async () => {
    await renderPage();

    // Change the day field so we can confirm the quick-fill overwrites it
    fireEvent.change(screen.getByDisplayValue("Mon - Sat"), {
      target: { value: "Mon - Fri" },
    });

    fireEvent.click(screen.getByRole("button", { name: /quick fill/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Mon - Sat")).toBeInTheDocument();
      expect(screen.getByDisplayValue("7 AM")).toBeInTheDocument();
      expect(screen.getByDisplayValue("9 PM")).toBeInTheDocument();
    });
  });

  test("'+ Add another day range' button appends a new empty hours row", async () => {
    await renderPage();

    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /add another day range/i }));

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2)
    );
  });

  test("Remove button deletes the corresponding hours row", async () => {
    mockContentIn.mockResolvedValueOnce({
      data: [
        { key: "home_about", draft: { title: "About Us", body: "" } },
        {
          key: "footer",
          draft: {
            phone: "",
            email: "",
            hours: [
              { day: "Mon - Sat", open: "7 AM", close: "9 PM" },
              { day: "Sun", open: "10 AM", close: "4 PM" },
            ],
          },
        },
      ],
      error: null,
    });

    await renderPage();

    expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[1]);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(1);
      expect(screen.queryByDisplayValue("Sun")).not.toBeInTheDocument();
    });
  });

  test("Remove button is disabled when only one hours row remains", async () => {
    await renderPage();

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    expect(removeButtons).toHaveLength(1);
    expect(removeButtons[0]).toBeDisabled();
  });

  // ── 5. Save Draft ─────────────────────────────────────────────────────────

  test("Save Draft calls Supabase update with draft payload for home_about and footer", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledTimes(2);
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining({ title: "About Us" }),
        }),
        "key",
        "home_about"
      );
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          draft: expect.objectContaining({ phone: "(916) 320-6955" }),
        }),
        "key",
        "footer"
      );
    });
  });

  test("Save Draft shows 'Draft saved.' message on success", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() =>
      expect(screen.getByText("Draft saved.")).toBeInTheDocument()
    );
  });

  test("Save Draft shows error message when Supabase returns an error", async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: { message: "RLS violation" } });

    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() =>
      expect(screen.getByText(/save failed/i)).toBeInTheDocument()
    );
  });

  // ── 6. Publish ────────────────────────────────────────────────────────────

  test("Publish calls Supabase update with published payload for home_about and footer", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledTimes(2);
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          published: expect.objectContaining({ title: "About Us" }),
        }),
        "key",
        "home_about"
      );
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          published: expect.objectContaining({ phone: "(916) 320-6955" }),
        }),
        "key",
        "footer"
      );
    });
  });

  test("Publish shows 'Published Successfully' message on success", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() =>
      expect(screen.getByText(/published successfully/i)).toBeInTheDocument()
    );
  });

  test("Publish shows error message when Supabase returns an error", async () => {
    mockUpdateEq.mockResolvedValueOnce({ error: { message: "RLS violation" } });

    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() =>
      expect(screen.getByText(/publish failed/i)).toBeInTheDocument()
    );
  });

  // ── 7. Saving State ───────────────────────────────────────────────────────

  test("Save Draft and Publish buttons are disabled with 'Working…' shown while saving", async () => {
    // Use a deferred for the first update call so saving stays in-flight.
    // We must NOT use `await user.click()` here — userEvent wraps in act(),
    // which in React 18 waits for ALL pending promises, causing a timeout.
    // fireEvent.click() dispatches synchronously and avoids that hang.
    const deferred = createDeferred();
    mockUpdateEq
      .mockReturnValueOnce(deferred.promise)   // first key (home_about): pending
      .mockResolvedValueOnce({ error: null });  // second key (footer): immediate

    await renderPage();

    const saveDraftBtn = screen.getByRole("button", { name: /save draft/i });
    const publishBtn = screen.getByRole("button", { name: /^publish$/i });

    fireEvent.click(saveDraftBtn);

    // setSaving(true) runs before the first await in saveDraft(), so the
    // buttons should be disabled as soon as React flushes the state update.
    await waitFor(() => {
      expect(saveDraftBtn).toBeDisabled();
      expect(publishBtn).toBeDisabled();
      expect(screen.getByText("Working…")).toBeInTheDocument();
    });

    deferred.resolve({ error: null });

    await waitFor(() => {
      expect(saveDraftBtn).not.toBeDisabled();
      expect(screen.queryByText("Working…")).not.toBeInTheDocument();
    });
  });

  // ── 8. Preview Draft Link ─────────────────────────────────────────────────

  test("Preview Draft link points to '/?preview=1' and opens in a new tab", async () => {
    await renderPage();

    const previewLink = screen.getByRole("link", { name: /preview draft/i });
    expect(previewLink).toHaveAttribute("href", "/?preview=1");
    expect(previewLink).toHaveAttribute("target", "_blank");
  });

  // ── 9. Site Reflection ────────────────────────────────────────────────────
  // Verifies that changes made in the editor are written to the `published`
  // column in Supabase — which is what the public-facing website reads.

  test("edited About Us title is reflected in the published payload sent to Supabase", async () => {
    const user = userEvent.setup();
    await renderPage();

    fireEvent.change(screen.getByDisplayValue("About Us"), {
      target: { value: "Who We Are" },
    });

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          published: expect.objectContaining({ title: "Who We Are" }),
        }),
        "key",
        "home_about"
      );
    });
  });

  test("edited Footer phone is reflected in the published payload sent to Supabase", async () => {
    const user = userEvent.setup();
    await renderPage();

    fireEvent.change(screen.getByDisplayValue("(916) 320-6955"), {
      target: { value: "(555) 555-0001" },
    });

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(mockUpdateEq).toHaveBeenCalledWith(
        expect.objectContaining({
          published: expect.objectContaining({ phone: "(555) 555-0001" }),
        }),
        "key",
        "footer"
      );
    });
  });

  test("edited business hours open time is reflected in the published payload", async () => {
    const user = userEvent.setup();
    await renderPage();

    fireEvent.change(screen.getByDisplayValue("7 AM"), {
      target: { value: "8 AM" },
    });

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      const footerCall = mockUpdateEq.mock.calls.find(
        ([, , key]) => key === "footer"
      );
      expect(footerCall).toBeDefined();
      expect(footerCall[0].published.hours[0].open).toBe("8 AM");
    });
  });

  // ── 10. Clean Hours ───────────────────────────────────────────────────────

  test("fully empty hours rows are filtered out before saving the draft", async () => {
    const user = userEvent.setup();
    await renderPage();

    // Add an empty row and leave it blank
    fireEvent.click(screen.getByRole("button", { name: /add another day range/i }));

    await user.click(screen.getByRole("button", { name: /save draft/i }));

    await waitFor(() => {
      const footerCall = mockUpdateEq.mock.calls.find(
        ([, , key]) => key === "footer"
      );
      expect(footerCall).toBeDefined();
      // Only the filled row should survive the clean step
      expect(footerCall[0].draft.hours).toHaveLength(1);
      expect(footerCall[0].draft.hours[0].day).toBe("Mon - Sat");
    });
  });

  test("fully empty hours rows are filtered out before publishing", async () => {
    const user = userEvent.setup();
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /add another day range/i }));

    await user.click(screen.getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      const footerCall = mockUpdateEq.mock.calls.find(
        ([, , key]) => key === "footer"
      );
      expect(footerCall).toBeDefined();
      expect(footerCall[0].published.hours).toHaveLength(1);
    });
  });
});
