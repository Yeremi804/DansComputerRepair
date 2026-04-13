import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateComputerConfigurationForm from "../src/app/create-computer-configuration-form/page";

const mockFetch = jest.fn();

const optionData = {
  cpu: [{ id: 1, name: "Ryzen 7 7800X3D", price: 399.99 }],
  gpu: [{ id: 2, name: "RTX 4070 Super", price: 599.99 }],
  motherboard: [{ id: 3, name: "MSI B650", price: 189.99 }],
  memory: [{ id: 4, name: "32GB DDR5", price: 119.99 }],
  storage: [{ id: 5, name: "2TB NVMe SSD", price: 149.99 }],
  psu: [{ id: 6, name: "750W Gold PSU", price: 109.99 }],
  case: [{ id: 7, name: "NZXT H6 Flow", price: 129.99 }],
  cooling: [{ id: 8, name: "240mm AIO", price: 99.99 }],
  operating_system: [{ id: 9, name: "Windows 11 Pro", price: 139.99 }],
  networking: [{ id: 10, name: "Wi-Fi 6 Card", price: 49.99 }],
};

const expectedOptionTypes = [
  "cpu",
  "gpu",
  "motherboard",
  "memory",
  "storage",
  "psu",
  "case",
  "cooling",
  "operating_system",
  "networking",
];

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}

  disconnect() {}

  trigger() {
    this.callback([{ type: "attributes", attributeName: "class" }]);
  }
}

function getSelect(container, name) {
  return container.querySelector(`select[name="${name}"]`);
}

describe("CreateComputerConfigurationForm", () => {
  let mutationObserverInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    document.documentElement.className = "";

    global.fetch = mockFetch;

    global.MutationObserver = jest.fn((callback) => {
      mutationObserverInstance = new MockMutationObserver(callback);
      return mutationObserverInstance;
    });

    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.startsWith("/api/options?type=")) {
        const type = new URL(`http://localhost${url}`).searchParams.get("type");
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: optionData[type] || [] }),
        });
      }

      if (url === "/api/config") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        });
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
  });

  test("renders the page title, sections, and key fields", async () => {
    render(<CreateComputerConfigurationForm />);

    expect(
      screen.getByRole("heading", { name: /computer configuration form/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /1\. customer information/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /2\. core components/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /3\. additional options/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /4\. other requests \/ questions/i })
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone Number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Budget Range")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Intended Use")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/additional info, special requests, or questions/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/i agree to receive sms notifications about my computer configuration status\./i)
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^submit$/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  test("fetches all option groups on mount", async () => {
    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      const optionCalls = mockFetch.mock.calls
        .map(([url]) => url)
        .filter((url) => typeof url === "string" && url.startsWith("/api/options?type="));

      expect(optionCalls).toHaveLength(10);

      for (const type of expectedOptionTypes) {
        expect(optionCalls).toContain(`/api/options?type=${encodeURIComponent(type)}`);
      }
    });
  });

  test("renders fetched select options with formatted prices", async () => {
    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /ryzen 7 7800x3d — \$399\.99/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("option", { name: /rtx 4070 super — \$599\.99/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /windows 11 pro — \$139\.99/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /wi-fi 6 card — \$49\.99/i })
    ).toBeInTheDocument();
  });

  test("keeps working when option fetches fail", async () => {
    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.startsWith("/api/options?type=")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ data: [] }),
        });
      }

      if (url === "/api/config") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ok: true }),
        });
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(10);
    });

    expect(
      screen.getByRole("option", { name: /select a cpu/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /ryzen 7 7800x3d/i })
    ).not.toBeInTheDocument();
  });

  test("submits all entered values and sms consent in payload", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /ryzen 7 7800x3d — \$399\.99/i })
      ).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Name"), "Alice Johnson");
    await user.type(screen.getByPlaceholderText("Phone Number"), "9165551234");
    await user.type(screen.getByPlaceholderText("Email Address"), "alice@example.com");
    await user.type(screen.getByPlaceholderText("Budget Range"), "$1500-$2000");
    await user.type(screen.getByPlaceholderText("Intended Use"), "Gaming and streaming");

    await user.selectOptions(getSelect(container, "CPU"), "Ryzen 7 7800X3D");
    await user.selectOptions(getSelect(container, "GPU"), "RTX 4070 Super");
    await user.selectOptions(getSelect(container, "Motherboard"), "MSI B650");
    await user.selectOptions(getSelect(container, "Memory"), "32GB DDR5");
    await user.selectOptions(getSelect(container, "Storage"), "2TB NVMe SSD");
    await user.selectOptions(getSelect(container, "PSU"), "750W Gold PSU");
    await user.selectOptions(getSelect(container, "Case"), "NZXT H6 Flow");
    await user.selectOptions(getSelect(container, "Cooling"), "240mm AIO");
    await user.selectOptions(getSelect(container, "Operating System"), "Windows 11 Pro");
    await user.selectOptions(getSelect(container, "Networking"), "Wi-Fi 6 Card");

    await user.type(
      screen.getByPlaceholderText(/additional info, special requests, or questions/i),
      "Please prioritize quiet cooling and clean cable management."
    );

    const smsCheckbox = screen.getByRole("checkbox");
    await user.click(smsCheckbox);

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/config",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        })
      );
    });

    const submitCall = mockFetch.mock.calls.find(([url]) => url === "/api/config");
    const payload = JSON.parse(submitCall[1].body);

    expect(payload).toEqual({
      Name: "Alice Johnson",
      "Phone Number": "9165551234",
      "Email Address": "alice@example.com",
      "Budget Range": "$1500-$2000",
      "Intended Use": "Gaming and streaming",
      CPU: "Ryzen 7 7800X3D",
      GPU: "RTX 4070 Super",
      Motherboard: "MSI B650",
      Memory: "32GB DDR5",
      Storage: "2TB NVMe SSD",
      PSU: "750W Gold PSU",
      Case: "NZXT H6 Flow",
      Cooling: "240mm AIO",
      "Operating System": "Windows 11 Pro",
      Networking: "Wi-Fi 6 Card",
      otherRequests: "Please prioritize quiet cooling and clean cable management.",
      sms_consent: true,
    });
  });

  test("shows sending state while submit is in progress", async () => {
    const user = userEvent.setup();
    const deferredSubmit = createDeferred();

    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.startsWith("/api/options?type=")) {
        const type = new URL(`http://localhost${url}`).searchParams.get("type");
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: optionData[type] || [] }),
        });
      }

      if (url === "/api/config") {
        return deferredSubmit.promise;
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    expect(screen.getByRole("button", { name: /submitting\.\.\./i })).toBeDisabled();
    expect(screen.getByText(/sending…/i)).toBeInTheDocument();

    deferredSubmit.resolve({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await waitFor(() => {
      expect(screen.getByText(/submitted — we will contact you soon\./i)).toBeInTheDocument();
    });
  });

  test("resets fields and sms consent after successful submit", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Name");
    const phoneInput = screen.getByPlaceholderText("Phone Number");
    const notesInput = screen.getByPlaceholderText(/additional info, special requests, or questions/i);
    const smsCheckbox = screen.getByRole("checkbox");
    const cpuSelect = getSelect(container, "CPU");

    await user.type(nameInput, "Reset Me");
    await user.type(phoneInput, "1234567890");
    await user.type(notesInput, "Some notes");
    await user.selectOptions(cpuSelect, "Ryzen 7 7800X3D");
    await user.click(smsCheckbox);

    expect(nameInput).toHaveValue("Reset Me");
    expect(phoneInput).toHaveValue("1234567890");
    expect(notesInput).toHaveValue("Some notes");
    expect(cpuSelect).toHaveValue("Ryzen 7 7800X3D");
    expect(smsCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(screen.getByText(/submitted — we will contact you soon\./i)).toBeInTheDocument();
    });

    expect(nameInput).toHaveValue("");
    expect(phoneInput).toHaveValue("");
    expect(notesInput).toHaveValue("");
    expect(cpuSelect).toHaveValue("");
    expect(smsCheckbox).not.toBeChecked();
  });

  test("shows error state when submit fails", async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.startsWith("/api/options?type=")) {
        const type = new URL(`http://localhost${url}`).searchParams.get("type");
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: optionData[type] || [] }),
        });
      }

      if (url === "/api/config") {
        return Promise.resolve({
          ok: false,
          json: async () => ({ ok: false }),
        });
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(screen.getByText(/error sending — try again\./i)).toBeInTheDocument();
    });
  });

  test("shows error state when submit throws", async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation((url) => {
      if (typeof url === "string" && url.startsWith("/api/options?type=")) {
        const type = new URL(`http://localhost${url}`).searchParams.get("type");
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: optionData[type] || [] }),
        });
      }

      if (url === "/api/config") {
        return Promise.reject(new Error("network failed"));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => {
      expect(screen.getByText(/error sending — try again\./i)).toBeInTheDocument();
    });
  });

  test("updates select inline text color when a real option is chosen", async () => {
    const user = userEvent.setup();
    const { container } = render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /ryzen 7 7800x3d — \$399\.99/i })
      ).toBeInTheDocument();
    });

    const cpuSelect = getSelect(container, "CPU");

    expect(cpuSelect.style.color).toBe("rgb(148, 163, 184)");

    await user.selectOptions(cpuSelect, "Ryzen 7 7800X3D");

    expect(cpuSelect).toHaveValue("Ryzen 7 7800X3D");
    expect(cpuSelect.style.color).toBe("rgb(15, 23, 42)");
  });

  test("applies dark mode styles on initial render when html has dark class", async () => {
    document.documentElement.classList.add("dark");

    render(<CreateComputerConfigurationForm />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /computer configuration form/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText("Name");
    expect(nameInput.style.backgroundColor).toBe("rgb(15, 23, 42)");
    expect(nameInput.style.color).toBe("rgb(226, 232, 240)");

    const customerHeading = screen.getByRole("heading", {
      name: /1\. customer information/i,
    });
    expect(customerHeading.style.color).toBe("rgb(226, 232, 240)");
  });

  test("renders light mode styles by default when html does not have dark class", async () => {
  document.documentElement.classList.remove("dark");

  render(<CreateComputerConfigurationForm />);

  await waitFor(() => {
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
  });

  const nameInput = screen.getByPlaceholderText("Name");
  expect(nameInput.style.backgroundColor).toBe("rgb(255, 255, 255)");
  expect(nameInput.style.color).toBe("rgb(30, 41, 59)");

  const customerHeading = screen.getByRole("heading", {
    name: /1\. customer information/i,
  });
  expect(customerHeading.style.color).toBe("rgb(51, 65, 85)");
  });
});