import FAQAccordion from "./FAQAccordion";

export const metadata = {
  title: "FAQ | Dan's Computer Repair",
  description: "Find answers to frequently asked questions about Dan's Computer Repair services.",
};
// questions and answers 
export default function FAQPage() {
    const faqItems = [
        {
            question: "What types of devices do you repair?",
            answer: "We repair a wide range of devices including laptops, desktops, and custom-built PCs. We also offer IT services for network setup and troubleshooting."
        },
        {
            question: "How do I schedule a repair or service?",
            answer: "You can schedule a repair or service by contacting us through our website, giving us a call, or reaching out via Yelp. We will work with you to find a convenient time for your appointment."
        },
        {
            question: "What is your turnaround time for repairs?",
            answer: "Turnaround time varies depending on the issue and parts availability, but we typically aim to complete repairs within 24 hours."
        },
        {
            question: "Do you offer on-site support?",
            answer: "Yes, we offer on-site support for certain services such as network setup and troubleshooting. Please contact us to discuss your specific needs."
        },
        {
            question: "Do you have a storefront I can visit?",
            answer: "We do not have a physical storefront at this time. All services are provided on-site or remotely."
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept cash, credit/debit cards, and mobile payment options. Payment is due upon completion of the service."
        },
        {
            question: "Do you provide warranties on your repairs?",
            answer: "Yes, we offer a 6 month warranty on our repairs that is labor free, but you would need to pay for any needed parts."
        }
    ];

    return (
        <main className="bg-main-bg text-main-text">
            <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
                <h1 className="text-3xl font-semibold tracking-tight text-pink-800 sm:text-4xl mb-8">
                    Frequently Asked Questions
                </h1>
                <FAQAccordion items={faqItems} />
            </section>
        </main>
    ); 
}
