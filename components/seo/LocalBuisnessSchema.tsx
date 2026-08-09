import { siteConfig } from '@/config/site'

export default function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["MedicalBusiness", "LocalBusiness"],
        "@id": "https://skinhubujjain.com/#clinic",
        "name": `${siteConfig.clinicName} - Dr. Prateek Tiwari Dermatology Clinic`,
        "description": "Dr. Prateek Tiwari's Skin Hub Derma, Hair & Laser Clinic is Ujjain's leading dermatology and hair restoration center led by Dr. Prateek Tiwari (MBBS, DVD) in Rishi Nagar, Ujjain, Madhya Pradesh.",
        "url": "https://skinhubujjain.com",
        "telephone": "+91-9827042111",
        "email": "contact@skinhubujjain.com",
        "image": "https://skinhubujjain.com/assets/doctor.png",
        "priceRange": "INR 200 - INR 5000",
        "medicalSpecialty": "Dermatology",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Skin Hub & Physio Centre, Rishi Nagar",
          "addressLocality": "Ujjain",
          "addressRegion": "Madhya Pradesh",
          "postalCode": "456010",
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 23.1765,
          "longitude": 75.7885
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
            "opens": "09:00",
            "closes": "14:00"
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
            "opens": "17:00",
            "closes": "21:00"
          }
        ],
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "694",
          "bestRating": "5"
        }
      },
      {
        "@type": "Person",
        "@id": "https://skinhubujjain.com/#doctor",
        "name": "Dr. Prateek Tiwari",
        "jobTitle": "Dermatologist & Cosmetologist",
        "description": "Dr. Prateek Tiwari (MBBS, DVD) is Ujjain's top dermatologist with 12+ years of experience.",
        "worksFor": { "@id": "https://skinhubujjain.com/#clinic" }
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
