// test-scripts/navigation.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "../src/app/components/Header";
import Sidebar from "../src/app/components/Sidebar";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));



describe("Header + Sidebar navigation", () => {
  beforeEach(() => pushMock.mockClear());

  test("Header shows main links", () => {
    render(<Header />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  test("Header route click calls router.push", () => {
    render(<Header />);
    fireEvent.click(screen.getByText("Contact"));
    expect(pushMock).toHaveBeenCalledWith("/contact-form");
  });

  test("Sidebar links call router.push", () => {
    render(<Sidebar />);

    const dashboards = screen.getAllByText("Dashboard");
    // first match is the sidebar header title; second is the nav link
    fireEvent.click(dashboards[1]);

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  test("Header all expected links exist and route correctly", () => {
    render(<Header />);

    const expectedLinks = [
      { label: "Home", href: "/" },
      { label: "Computer Building", href: "/create-computer-configuration-form" },
      { label: "Service Request", href: "/service-request" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact-form" },
    ];

    expectedLinks.forEach(({ label, href }) => {
      const link = screen.getByText(label);
      expect(link).toBeInTheDocument();
      fireEvent.click(link);
      expect(pushMock).toHaveBeenLastCalledWith(href);
    });
  });

  test("Sidebar all expected links exist and route correctly", () => {
    render(<Sidebar />);

    const expectedSidebarLinks = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Parts", href: "/admin-parts" },
      { label: "Contacts", href: "/dashboard/customer-messages" },
      { label: "Review", href: "/dashboard/admin-reviews" },
      { label: "Audit Log", href: "/dashboard/audit" },
      { label: "Home Content", href: "/dashboard/home-content" },
      { label: "Settings", href: "/settings" },
      { label: "Metrics", href: "/dashboard/metric" },
    ];

    expectedSidebarLinks.forEach(({ label, href }) => {
      const all = screen.getAllByText(label);
      const node = label === "Dashboard" ? all[1] : all[0];
      expect(node).toBeInTheDocument();
      fireEvent.click(node);
      expect(pushMock).toHaveBeenLastCalledWith(href);
    });
  });
});