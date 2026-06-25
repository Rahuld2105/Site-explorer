/**
 * Heritage Places Collection - Seed Data
 * Generated for MongoDB
 * 
 * Collections:
 * - Historical Palaces & Fortifications
 * - Hill Forts
 * 
 * Usage:
 * mongoimport --db site_explorer --collection heritageplaces --file seeds/heritage-places.json
 * OR
 * node seeds/insert-heritage-places.js
 */

const heritagePlacesSeedData = [
  {
    place_id: "SW001",
    qr_id: "SW001",
    name: "Shaniwar Wada",
    slug: "shaniwar-wada",
    description: "Historic fortification and former seat of the Peshwas of the Maratha Empire. This magnificent palace stands as a testament to Maratha architectural brilliance and military strategy. The massive wooden palace that once stood here was destroyed in a fire in 1828, but the fortification walls and gates remain intact, offering visitors a glimpse into the glory of the Maratha Empire.",
    category: "Historical Palace/Fortification",
    latitude: 18.5195,
    longitude: 73.8553,
    district: "Pune",
    state: "Maharashtra",
    location: {
      type: "Point",
      coordinates: [73.8553, 18.5195]
    },
    images: [
      "https://images.unsplash.com/photo-1608848461950-0ff51b8e5f0b?w=800",
      "https://images.unsplash.com/photo-1610394095858-e88107053cf5?w=800",
      "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800"
    ],
    rating: 4.5,
    review_count: 2847,
    history: "Shaniwar Wada was built in 1732 by Peshwa Bajirao I and served as the administrative headquarters of the Maratha Empire for nearly a century. The palace was the political and military center of power during the height of Maratha dominance in India. The structure witnessed numerous historical events including treaties, battles planning, and administrative decisions that shaped the course of Indian history. The famous fire of 1828 destroyed the wooden palace structures, but the fort walls and gates remain as silent witnesses to the empire's grandeur. The palace was also the site of a brutal massacre in 1773 when Raghunathrao's son was killed here, marking one of the darkest chapters in Maratha history.",
    architecture: "The fort showcases remarkable Maratha military architecture with massive stone fortification walls built to withstand siege warfare. The main entrance features two impressive gates - the Dilkusha Gate and the Delhi Gate - both adorned with traditional Maratha architectural elements. The foundation reveals sophisticated stone construction techniques used in the 18th century. The remnants show evidence of advanced water management systems including reservoirs and channels. The wooden palace that once stood on the upper levels was a masterpiece of timber engineering, featuring multiple storeys with intricate wooden carvings and ornamental designs typical of Maratha palatial architecture.",
    best_time_to_visit: "October to February",
    estimated_visit_duration: "2–3 hours",
    entry_fee: 200,
    hours: "8:00 AM - 6:00 PM",
    contact: "+91-20-2464-2062",
    website: "https://www.saniwardwada.com",
    has_ai_content: true,
    ai_content: {
      overview: "Shaniwar Wada represents the zenith of Maratha architectural and military excellence. Built during the rule of Peshwa Bajirao I, this fortified palace complex served as the epicenter of Maratha Empire administration and military strategy. The name 'Shaniwar Wada' means 'Saturday Fort', possibly named for the day it was inaugurated. Despite the catastrophic fire that destroyed most of the wooden structures, the fort remains one of India's most significant historical landmarks, attracting scholars, historians, and tourists from around the world.",
      history: "The construction of Shaniwar Wada began in 1732 under Peshwa Bajirao I, one of the greatest military commanders of the Maratha Empire. The fort served as the capital of the Maratha Empire until 1818 when the British defeated the Peshwas in the Anglo-Maratha Wars. Throughout its history, Shaniwar Wada witnessed the rise and fall of the empire, including the rule of Peshwa Madhavrao who implemented significant administrative reforms. The fort saw intricate political maneuvering, including the famous incident in 1773 when Raghunathrao conspired against his brother Narayan Rao, resulting in a brutal assassination within the palace walls. The devastating fire of February 27, 1828, destroyed most of the wooden structures, but the fort walls and gates survived, allowing us to understand the original layout and architecture.",
      architecture: "The fort's architecture represents a sophisticated blend of military fortification and palatial design. The massive outer walls were constructed using locally quarried stone, held together without mortar using the traditional interlocking stone technique. The fort had seven gates, with the Dilkusha Gate and Delhi Gate being the most ornate. The palace structure within the fort was a multi-story wooden edifice featuring carved wooden pillars, ornate balconies, and elaborate window designs. The residential quarters featured courtyards for natural light and ventilation, while the administrative sections had large halls for meetings and ceremonies. Underground passages connected various sections, providing escape routes during emergencies. The water management system included wells, reservoirs, and channels, demonstrating advanced hydraulic engineering knowledge.",
      hidden_facts: [
        "The name 'Wada' is derived from the Marathi word meaning a large traditional mansion or fortification complex.",
        "Shaniwar Wada was the first civilian palace in India to have a lightning rod, installed in the 18th century.",
        "The palace had a unique architectural feature called 'Rang Mahal' (palace of colors) where walls were decorated with brilliant mineral-based pigments.",
        "A secret underground passage connects Shaniwar Wada to Panch Kund, located several kilometers away.",
        "The palace library contained thousands of manuscripts on Maratha history, warfare, and administration, most of which were destroyed in the 1828 fire.",
        "The famous incident where Raghunathrao's infant son Sawai was thrown from the palace walls occurred in 1773, leading to a succession crisis in the Maratha Empire.",
        "The fort has been a location for numerous Bollywood films, including 'Rang De Basanti' and 'Black'.",
        "Archaeological excavations have revealed artifacts including coins, pottery, weapons, and jewelry from the Maratha period."
      ],
      travel_tips: [
        "Visit during early morning (8-10 AM) to avoid crowds and experience the fort's serene atmosphere. The soft morning light is perfect for photography.",
        "Hire a knowledgeable local guide who can explain the historical significance of different sections. The guide can point out remnants of the original structures and share stories that bring history to life.",
        "Wear comfortable walking shoes and carry water, as the terrain is uneven and there's limited shade within the fort premises.",
        "The fort is particularly stunning during sunset, when the golden light illuminates the stone fortifications and creates dramatic shadows.",
        "Visit the Jangli Maharaj's cave nearby, which adds another layer to your understanding of Maratha history and spirituality.",
        "Photography is allowed but respect any restricted areas. The best photography spots are near the Dilkusha Gate and the upper ramparts.",
        "The adjacent Palkhi Chowk area has several restaurants and cafes serving traditional Maharashtrian cuisine.",
        "During monsoon (June-August), the fort is less crowded, but the stone can be slippery. Bring rain gear and exercise extra caution.",
        "Combine your visit with nearby attractions like Aga Khan Palace (3 km away) for a more comprehensive historical experience.",
        "Allow extra time if visiting on weekends or holidays, as tourist footfall is significantly higher."
      ]
    },
    qr_stats: {
      total_scans: 0,
      last_scan_at: null
    },
    geofence_polygon: {
      type: "Polygon",
      coordinates: [
        [
          [73.8530, 18.5220],
          [73.8575, 18.5220],
          [73.8575, 18.5170],
          [73.8530, 18.5170],
          [73.8530, 18.5220]
        ]
      ]
    },
    is_popular: true,
    featured: true
  },
  {
    place_id: "RJ001",
    qr_id: "RJ001",
    name: "Rajgad Fort",
    slug: "rajgad-fort",
    description: "One of the most strategically important and architecturally significant forts of Chhatrapati Shivaji Maharaj. Rajgad served as the capital of the Maratha Empire for 26 crucial years and remains one of the most well-preserved hilltop fortifications in India. The fort complex showcases exceptional military architecture with multiple defensive layers, water management systems, and living quarters that demonstrate the sophisticated planning of Maratha military establishments.",
    category: "Hill Fort",
    latitude: 18.2466,
    longitude: 73.6828,
    district: "Pune",
    state: "Maharashtra",
    location: {
      type: "Point",
      coordinates: [73.6828, 18.2466]
    },
    images: [
      "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      "https://images.unsplash.com/photo-1548013146-72d5f5b0d4f0?w=800",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
    ],
    rating: 4.8,
    review_count: 3156,
    history: "Rajgad Fort was built by Chhatrapati Shivaji Maharaj in 1656 and served as the capital of the Maratha Empire until Raigad Fort was completed in 1674. The fort was strategically located at an elevation of 2,280 meters above sea level, making it nearly impregnable to enemy attacks. Under Shivaji's reign, Rajgad became the political, military, and administrative center of the emerging Maratha power. The fort was never successfully breached by enemy forces due to its strategic location and superior fortification design. After Raigad became the capital, Rajgad continued to serve as an important military stronghold and administrative center. The fort remained under Maratha control throughout their reign and later came under British administration.",
    architecture: "Rajgad Fort displays masterful military architecture designed for maximum defensive capability. The fort complex comprises three main defensive structures: the main fort, the outer ramparts, and multiple bastions strategically positioned at vantage points. Padmavati Machi (Padmavati Peak), the highest point of the fort, served as the lookout and signal transmission station. Suvela Machi (Suvela Peak), another significant structure, served as a secondary fortification. Balekilla (Youth Fort), a separate structure, served as a garrison for soldiers. The walls are constructed using large stone blocks fitted without mortar using the traditional interlocking technique. Water management was sophisticated with multiple reservoirs, cisterns, and channels cut into rock to ensure year-round water supply. The living quarters show evidence of advanced planning with separate areas for military personnel, administration, and storage.",
    best_time_to_visit: "June to February",
    estimated_visit_duration: "5–8 hours",
    entry_fee: 100,
    hours: "Sunrise to Sunset",
    contact: "+91-2155-242-142",
    website: "https://www.rajgadfort.com",
    has_ai_content: true,
    ai_content: {
      overview: "Rajgad Fort stands as a monument to the military genius of Chhatrapati Shivaji Maharaj and the architectural sophistication of the Maratha Empire. Perched at an elevation of 2,280 meters, this hilltop fortress was the capital of the nascent Maratha Empire for 26 years and remains one of India's most strategically significant forts. The fort complex demonstrates an unprecedented understanding of military fortification principles, combining natural topography with engineered defenses to create an almost unconquerable stronghold. Today, Rajgad Fort remains a beacon of Maratha heritage and continues to inspire visitors with its grandeur and historical significance.",
      history: "Rajgad Fort was constructed in 1656 under the direct supervision of Chhatrapati Shivaji Maharaj, who recognized the strategic importance of the location for establishing a strong base for the nascent Maratha Empire. The fort served as the capital of the Maratha Empire from 1656 to 1674, during which time Shivaji consolidated Maratha power, resisted Mughal expansion, and established a robust administrative system. The period of Rajgad's ascendancy witnessed significant military campaigns against both the Adil Shahi of Bijapur and the Nizamshahi of Ahmednagar. The fort was the center of a thriving economy with markets, craftsmen, and a garrison of several thousand soldiers. When Raigad Fort was completed in 1674, the capital was shifted, but Rajgad continued to serve as an important military installation. Throughout the 18th century, Rajgad remained under Maratha control and served as a symbol of their power. The fort later came under British control after the Anglo-Maratha Wars.",
      architecture: "Rajgad Fort represents the pinnacle of 17th-century Indian military architecture. The fort complex is built on a hilltop with three main defensive structures arranged strategically. The outer walls are constructed from massive stone blocks, some weighing over a ton, fitted using the traditional interlocking technique without mortar. The fort has multiple gates, each positioned at strategic locations to control access and provide defensive advantages. Padmavati Machi, the main fortification, features a multi-tiered defensive structure with bastions for cannon placements. Suvela Machi served as a secondary fortification and housed additional military personnel. The main living quarters are arranged around a central courtyard, providing shelter and administrative space. The palace section features rooms with high ceilings and ventilation openings designed for the cool mountain climate. An ingenious system of stepped channels directs rainfall into multiple cisterns and reservoirs, providing water for the garrison. Underground passages connect different sections of the fort, allowing for covert movement and strategic retreats.",
      hidden_facts: [
        "Rajgad Fort has a network of over 25 cisterns and reservoirs that can store water for over a year, even in times of drought.",
        "The fort was designed with multiple backup water sources including underground springs, making it virtually impossible to force surrender through water blockade.",
        "Historical records indicate that the fort garrison could sustain over 5,000 soldiers with provisions and water for extended periods.",
        "Several secret escape tunnels from the fort are believed to lead to nearby valleys, though their exact locations remain largely undocumented.",
        "The fort has excellent natural acoustic properties, allowing commanders to communicate across vast distances using sound transmission.",
        "Archaeological findings suggest the fort had a well-developed administration system with separate areas for tax collection, records management, and judicial proceedings.",
        "During the monsoon season, the fort becomes almost completely inaccessible, making it an ideal defensive position against monsoon-based assaults.",
        "The fort has served as a location for several historical films and documentaries depicting Maratha history.",
        "Recent restoration efforts by the Indian government have uncovered new chambers and passages that reveal more about the fort's layout and daily operations.",
        "The surrounding area is home to several endemic plant and animal species, making it significant from both historical and ecological perspectives."
      ],
      travel_tips: [
        "The trek to Rajgad Fort involves a steep climb of about 2-3 hours from the base village of Khed. Start early in the morning to avoid the afternoon heat.",
        "Wear sturdy hiking boots with good grip, as the stone steps can be slippery, especially during or after monsoon season.",
        "Carry at least 2-3 liters of water per person, as the fort has limited facilities. The ascent is strenuous, and proper hydration is essential.",
        "The temperature at the top is significantly cooler than at the base. Bring a light jacket or sweater, especially for early morning visits.",
        "A guide is highly recommended, as the fort complex is vast and easy to get lost. Local guides from Khed village can provide detailed historical context.",
        "Allow 5-8 hours for the complete visit including ascent, exploration, and descent. Time your visit to witness the sunset from the fort, which offers spectacular views.",
        "Photography from the top offers 360-degree views of surrounding valleys and nearby forts. Arrive with a charged camera or power bank.",
        "Combine Rajgad with nearby Torna Fort (6 km away) for a comprehensive understanding of Maratha fortifications and military strategy.",
        "Food options at the base are limited. Pack light snacks and energy food for the trek.",
        "Respect the site as a historical monument. Do not litter, deface walls, or remove any artifacts."
      ]
    },
    qr_stats: {
      total_scans: 0,
      last_scan_at: null
    },
    geofence_polygon: {
      type: "Polygon",
      coordinates: [
        [
          [73.6800, 18.2490],
          [73.6860, 18.2490],
          [73.6860, 18.2440],
          [73.6800, 18.2440],
          [73.6800, 18.2490]
        ]
      ]
    },
    is_popular: true,
    featured: true
  }
];

module.exports = heritagePlacesSeedData;
