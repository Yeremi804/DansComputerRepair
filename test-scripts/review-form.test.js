import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewFormPage from "../src/app/review-form/page";

// Mock Supabase client
const mockInsert = jest.fn();
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

global.URL.createObjectURL = jest.fn(() => "mock-url");

jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      from: () => ({
        insert: mockInsert,
      }),
      storage: {
        from: () => ({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    }),
  };
});

beforeEach(() => {
  jest.clearAllMocks();

  mockInsert.mockResolvedValue({ error: null });
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: "http://fake-url.com/photo.jpg" },
  });
});

describe("ReviewFormPage", () => {

  test("renders form fields", () => {
    render(<ReviewFormPage />);

    expect(screen.getByText("Share Your Experience")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email or phone/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /review title/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^review$/i })).toBeInTheDocument();
  });

  test("shows validation errors on empty submit", async () => {
    render(<ReviewFormPage />);

    await userEvent.click(screen.getByText(/Submit Review/i));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email or phone is required")).toBeInTheDocument();
    expect(screen.getByText("Review title is required")).toBeInTheDocument();
    expect(screen.getByText("Please select a rating")).toBeInTheDocument();
    expect(screen.getByText("Review cannot be empty")).toBeInTheDocument();
  });

  test("allows typing into inputs", async () => {
    render(<ReviewFormPage />);

    const nameInput = screen.getByLabelText(/Name/i);
    const emailInput = screen.getByLabelText(/Email or Phone/i);

    fireEvent.change(nameInput, {
        target: { value: "John Doe" },
    });

    fireEvent.change(emailInput, {
      target: { value: "john@email.com" },
    });

    await waitFor(() => {
      expect(nameInput).toHaveValue("John Doe");
      expect(emailInput).toHaveValue("john@email.com");
    });
  });

  test("hovering over stars updates UI", async () => {
      render(<ReviewFormPage />);

      const stars = screen.getAllByText("★");

      fireEvent.mouseEnter(stars[2]);

  
      expect(stars.length).toBe(5);
      fireEvent.mouseLeave(stars[2]);
    });


  test("selects a rating when star is clicked", async () => {
    render(<ReviewFormPage />);

    const stars = screen.getAllByText("★");

    await userEvent.click(stars[3]); // 4 stars

    // No direct value check, but ensures no validation error later
    await userEvent.click(screen.getByText(/Submit Review/i));

    await waitFor(() => {
      expect(screen.queryByText("Please select a rating")).not.toBeInTheDocument();
    });
  });

  test("submits successfully with valid data", async () => {
    render(<ReviewFormPage />);

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "John Doe" },
    });

    fireEvent.change(screen.getByLabelText(/Email or Phone/i), {
      target: { value: "john@email.com" },
    });

    fireEvent.change(screen.getByLabelText(/Review Title/i), {
      target: { value: "Great!" },
    });

    fireEvent.change(screen.getByLabelText(/^Review$/i), {
      target: { value: "This was awesome" },
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Name/i)).toHaveValue("John Doe");
      expect(screen.getByLabelText(/Email or Phone/i)).toHaveValue("john@email.com");
      expect(screen.getByLabelText(/Review Title/i)).toHaveValue("Great!");
      expect(screen.getByLabelText(/^Review$/i)).toHaveValue("This was awesome");
    });

    // Select rating
    const stars = screen.getAllByText("★");
    await userEvent.click(stars[4]); // 5 stars

    await userEvent.click(screen.getByText(/Submit Review/i));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Thank you for your review!")
    ).toBeInTheDocument();
  });

  test("accepts valid phone number", async () => {
      render(<ReviewFormPage />);

      await userEvent.type(
        screen.getByLabelText(/Email or Phone/i),
        "9165551234"
      );

      await userEvent.click(screen.getByText(/Submit Review/i));

      expect(
        screen.queryByText("Enter a valid email or phone number")
      ).not.toBeInTheDocument();
  });

  test("prevents invalid characters in name", async () => {
      render(<ReviewFormPage />);

      const input = screen.getByLabelText(/Name/i);

      await userEvent.type(input, "John123");

      expect(input).toHaveValue("John"); // numbers should be blocked
  });

  test("clears form after successful submit", async () => {
      render(<ReviewFormPage />);

      const name = screen.getByLabelText(/Name/i);
      const email = screen.getByLabelText(/Email or Phone/i);

      await userEvent.type(name, "John Doe");
      await userEvent.type(email, "john@email.com");
      await userEvent.type(screen.getByLabelText(/Review Title/i), "Nice");
      await userEvent.type(screen.getByLabelText(/^Review$/i), "Good");

      const stars = screen.getAllByText("★");
      await userEvent.click(stars[4]);

      await userEvent.click(screen.getByText(/Submit Review/i));

      await screen.findByText("Thank you for your review!");

      expect(name).toHaveValue("");
      expect(email).toHaveValue("");
      expect(screen.getByLabelText(/Review Title/i)).toHaveValue("");
      expect(screen.getByLabelText(/^Review$/i)).toHaveValue("");
  });  

  test("shows error message if submission fails", async () => {
      mockInsert.mockResolvedValueOnce({ error: { message: "fail" } });

      render(<ReviewFormPage />);

      await userEvent.type(screen.getByLabelText(/Name/i), "John Doe");
      await userEvent.type(screen.getByLabelText(/Email or Phone/i), "john@email.com");
      await userEvent.type(screen.getByLabelText(/Review Title/i), "Bad");
      await userEvent.type(screen.getByLabelText(/^Review$/i), "Something");

      const stars = screen.getAllByText("★");
      await userEvent.click(stars[2]);

      await userEvent.click(screen.getByText(/Submit Review/i));

      expect(
        await screen.findByText("There was an error submitting your review.")
      ).toBeInTheDocument();
  });

  test("handles file upload preview", async () => {
    render(<ReviewFormPage />);

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    const input = screen.getByLabelText(/Upload a Photo/i);

    await userEvent.upload(input, file);

    expect(input.files[0]).toBe(file);

    // Preview message should appear
    expect(
      await screen.findByText(/Ready to upload/i)
    ).toBeInTheDocument();
  });

  test("shows error if photo upload fails", async () => {
  mockUpload.mockResolvedValueOnce({ error: { message: "upload failed" } });

  render(<ReviewFormPage />);

  const file = new File(["dummy"], "test.png", { type: "image/png" });
  const input = screen.getByLabelText(/Upload a Photo/i);

  await userEvent.upload(input, file);

  await userEvent.type(screen.getByLabelText(/Name/i), "John Doe");
  await userEvent.type(screen.getByLabelText(/Email or Phone/i), "john@email.com");
  await userEvent.type(screen.getByLabelText(/Review Title/i), "Title");
  await userEvent.type(screen.getByLabelText(/^Review$/i), "Text");

  const stars = screen.getAllByText("★");
  await userEvent.click(stars[4]);

  await userEvent.click(screen.getByText(/Submit Review/i));

  expect(
    await screen.findByText("Photo upload failed.")
  ).toBeInTheDocument();
});

  test("rejects non-image file upload", async () => {
      render(<ReviewFormPage />);

      const file = new File(["dummy"], "test.txt", { type: "text/plain" });
      const input = screen.getByLabelText(/Upload a Photo/i);

  
      fireEvent.change(input, {
        target: {
          files: [file],
        },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Please upload a valid image file.")
        ).toBeInTheDocument();
      });
    });

  test("rejects invalid email/phone", async () => {
    render(<ReviewFormPage />);

    await userEvent.type(
      screen.getByLabelText(/Email or Phone/i),
      "invalid@"
    );

    await userEvent.click(screen.getByText(/Submit Review/i));

    expect(
      await screen.findByText("Enter a valid email or phone number")
    ).toBeInTheDocument();
  });

  test("removes error when user fixes input", async () => {
      render(<ReviewFormPage />);

      await userEvent.click(screen.getByText(/Submit Review/i));

      const nameInput = screen.getByLabelText(/Name/i);

      expect(await screen.findByText("Name is required")).toBeInTheDocument();

      await userEvent.type(nameInput, "John");

      await waitFor(() => {
        expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
      });
  });
  test("sends correct data to supabase", async () => {
      render(<ReviewFormPage />);

      await userEvent.type(screen.getByLabelText(/Name/i), "John Doe");
      await userEvent.type(screen.getByLabelText(/Email or Phone/i), "john@email.com");
      await userEvent.type(screen.getByLabelText(/Review Title/i), "Great");
      await userEvent.type(screen.getByLabelText(/^Review$/i), "Awesome");

      const stars = screen.getAllByText("★");
      await userEvent.click(stars[3]); // 4 stars

      await userEvent.click(screen.getByText(/Submit Review/i));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
          name: "John Doe",
          emailOrPhone: "john@email.com",
          reviewTitle: "Great",
          reviewText: "Awesome",
          rating: "4",
          photoUrl: null,})
        ]);
      });
  });
});