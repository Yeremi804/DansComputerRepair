"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Services from "./home-services-title.js";


export default function Home() {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [localReviews, setLocalReviews] = useState([]);
  const [yelpReviews, setYelpReviews] = useState([]);
    
  const [index, setIndex] = useState(0);
  const [showYelp, setShowYelp] = useState(false);

  const reviews = showYelp ? yelpReviews : localReviews;

  useEffect(() => setIndex(0), [showYelp, localReviews.length]);

  useEffect(() => {
    async function fetchLocalReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("creationTime", { ascending: false });

      console.log("Fetched from Supabase:", data, "error:", error);

      if (error) {
        console.error(error);
        setLocalReviews([]);
        return;
      }

      const visibleReviews = (data || []).filter((review) => review.show_on_site !== false);
      const mappedReviews = visibleReviews.map((review) => ({
        name: review.name,
        rating: review.rating,
        date: new Date(review.creationTime).toLocaleDateString(),
        text: review.reviewText,
        photos: review.photoUrl ? [review.photoUrl] : [],
      }));
      setLocalReviews(mappedReviews);
    }

    fetchLocalReviews();
  }, []);

  useEffect(() => {
    async function fetchYelpReviews() {
      const { data, error } = await supabase
        .from("Yelp_Embed_Reviews")
        .select("*")
        .order("id", { ascending: true });

        console.log("Fetched Yelp embeds:", data, "error:", error);

        if (error) {
          console.error(error);
          setYelpReviews([]);
          return;
        }

        const visibleYelp = (data || []).filter((row) => row.show_on_site !== false);
        const mapped = visibleYelp.map(row => ({
          embed: row.embed
        }));

        setYelpReviews(mapped);
    }

    fetchYelpReviews();
  }, []);
  

  useEffect(() => {
    if (showYelp) {
      const script = document.createElement("script");
      script.src = "https://www.yelp.com/embed/widgets.js";
      script.async = true;

      script.onload = () => {
        document.body.classList.add("yelp-embed-loaded");
      }
      document.body.appendChild(script);

      return () => {
        document.body.classList.remove("yelp-embed-loaded");
        document.body.removeChild(script);
      };
    }
  }, [showYelp, index]);

  const nextReview = () => setIndex((index + 1) % reviews.length);
  const prevReview = () => setIndex((index - 1 + reviews.length) % reviews.length);

return (
  <main className="flex flex-col min-h-screen">
    {/* --- Blank space for future content --- */}
      <section className="flex-grow flex items-center justify-center"></section>

      {/* Services Section */}
      <Services />

      {/* --- About Us Section --- */}
      <section className="text-center bg-main-bg pt-10 pb-6 px-6">
        <div className="max-w-3xl bg-main-bg mx-auto">
          <h2 className="text-4xl md:text-4xl font-bold text-main-text mb-4">About Us</h2>
          <p className="text-lg text-main-text leading-relaxed">
            At Dan's Computer Repair, we provide fast, reliable, and affordable solutions for all your tech needs right here in the Sacramento area. From fixing slow computers to custom PC builds and hardware upgrades, we are proud to serve our local community with honest service you can trust.
          </p>
        </div>
      </section>

      {/* --- Service Information Sections --- */}
      <section className="bg-main-bg py-16">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          
          {/* General Services Section */}
          <div id="general-services" className="scroll-mt-20">
            <div className="rounded-xl border border-gray-200 p-8 shadow-sm transition hover:shadow-lg hover:border-pink-300">
              <h2 className="text-2xl font-semibold text-pink-800 mb-4">
                Computer Repair & IT Services
              </h2>
              <p className="text-lg leading-relaxed text-gray-700 mb-6">
                Reliable, transparent service for laptops and desktops. We diagnose issues 
                quickly, explain your options, and keep you updated at every step. Reach out 
                any time to discuss your device.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-pink-800 mb-4">Services</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-3 items-center">
                      <span className="h-2 w-2 rounded-full bg-pink-700 flex-shrink-0" />
                      <span className="text-gray-700">PC and Mac diagnostics</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="h-2 w-2 rounded-full bg-pink-700 flex-shrink-0" />
                      <span className="text-gray-700">Virus and malware removal</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="h-2 w-2 rounded-full bg-pink-700 flex-shrink-0" />
                      <span className="text-gray-700">Hardware upgrades (RAM, SSD, GPU)</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="h-2 w-2 rounded-full bg-pink-700 flex-shrink-0" />
                      <span className="text-gray-700">Data backup and recovery</span>
                    </li>
                    <li className="flex gap-3 items-center">
                      <span className="h-2 w-2 rounded-full bg-pink-700 flex-shrink-0" />
                      <span className="text-gray-700">Network setup and troubleshooting</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-pink-800 mb-4">Service Steps</h3>
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">1.</span>
                      <span className="leading-relaxed">Tell us what you need repaired or built.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">2.</span>
                      <span className="leading-relaxed">Schedule drop-off or on-site support.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">3.</span>
                      <span className="leading-relaxed">Receive a clear estimate.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">4.</span>
                      <span className="leading-relaxed">We repair, test, and verify your device.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">5.</span>
                      <span className="leading-relaxed">Pick up or delivery with post-service guidance.</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-6 shadow-sm bg-gray-50">
                <h3 className="text-xl font-semibold text-pink-800 mb-3">
                  Unsure of what you need?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Describe your issue and we&apos;ll recommend the right service,
                  timeline, and options to fit your budget.
                </p>
                <a
                  href="/service-request"
                  className="inline-flex w-full items-center justify-center rounded-md border border-pink-600 px-4 py-3 text-pink-700 transition hover:bg-pink-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  Start a Service Request
                </a>
              </div>
            </div>
          </div>

          {/* Computer Configuration Section */}
          <div id="computer-configuration" className="scroll-mt-20">
            <div className="rounded-xl border border-gray-200 p-8 shadow-sm transition hover:shadow-lg hover:border-pink-300">
              <h2 className="text-2xl font-semibold text-pink-800 mb-4">
                Custom PC Builds
              </h2>
              <p className="text-lg leading-relaxed text-gray-700 mb-6">
                Looking for a custom-built PC tailored to your needs? Whether it&apos;s for gaming, 
                creative work, or business, we&apos;ll help you design and build the perfect system 
                within your budget. Our expert team ensures quality parts, proper installation, and 
                thorough testing for optimal performance.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-pink-800 mb-4">Build Steps</h3>
                  <ol className="space-y-3 text-gray-700">
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">1.</span>
                      <span className="leading-relaxed">Tell us your needs and budget.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">2.</span>
                      <span className="leading-relaxed">We recommend the best components.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">3.</span>
                      <span className="leading-relaxed">We build and test your system.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-pink-700">4.</span>
                      <span className="leading-relaxed">Pick up with setup guidance.</span>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-6 shadow-sm bg-gray-50">
                <h3 className="text-xl font-semibold text-pink-800 mb-3">
                  Ready to build your dream PC?
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Use our Computer Configuration tool to select your components and get started. 
                  We&apos;ll guide you through the process and provide expert recommendations.
                </p>
                <a
                  href="/create-computer-configuration-form"
                  className="inline-flex w-full items-center justify-center rounded-md border border-pink-600 px-4 py-3 text-pink-700 transition hover:bg-pink-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                >
                  Go to Computer Configuration
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

        {/* --- Yelp Reviews Section --- */}
        <section className="bg-main-bg text-main-text py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-4 mb-10">
              <h2 className="text-2xl font-semibold mb-10">
                {showYelp ? "Yelp Reviews For Dan's Computer Repair" : "Local Reviews For Dan's Computer Repair"}
              </h2>
              {/* Toggle Button */}
              <button
                onClick={() => setShowYelp(!showYelp)}
                setindex={0}
            
                  className="mb-8 px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-800 transition"
              >
                {showYelp ? "Show Local Reviews" : "Show Yelp Reviews"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-6">
              {/* < Button */}
              <button
                onClick={prevReview}
                className="text-3xl bg-black text-black px-4 py-2 rounded-full hover:bg-gray-700 transition"
              >
                {'<'}
              </button>

            {/* Review box */}
            <div
  key={index}
  className={`bg-gray-300 text-black rounded-lg p-8 w-full max-w-3xl min-h-[250px] flex flex-col justify-center text-center shadow-md ${
    showYelp ? "items-center" : ""
  }`}
>

  {!reviews[index] ? (
    <p>No Reviews or Is Loading Them.....</p>
  ) :
  !showYelp ? (
    <>

      <div className="flex justify-between w-full">
        <span className="font-semibold">{reviews[index].name}</span>
        
      </div>
      <div className="flex justify-between w-full mb-2 text-2xl">
        {"★".repeat(reviews[index].rating)}
        {"☆".repeat(5 - reviews[index].rating)}
        <span className="text-base ml-10">{reviews[index].date}</span>
      </div>
      <div className="flex justify-between w-full mb-2">
      <p className="text-base indent-0">{reviews[index].text}</p>
      </div>
      {/* Photo Gallery */}
    {reviews[index].photos && (
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {reviews[index].photos.map((photo, i) => (
          <img
            key={i}
            src={photo}
            alt={`Review photo ${i + 1}`}
            className="max-h-32 object-cover rounded-lg shadow-md hover:scale-105 transition-transform"
          />
        ))}
      </div>
    )}
    </>
  ) : (
    <div
    className="w-full"
     dangerouslySetInnerHTML={{ __html: reviews[index].embed }} 
     />
  )}
</div>

            {/* > Button */}
            <button
              onClick={nextReview}
              className="text-3xl bg-white text-black px-4 py-2 rounded-full hover:bg-gray-700 transition"
            >
              {'>'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}