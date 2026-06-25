export const PLACE_CONTENT = {
  rajgad: {
    id: 'rajgad',
    place_id: 'rajgad',
    name: 'Rajgad Fort',
    location_name: 'Pune, Maharashtra',
    latitude: 18.2469,
    longitude: 73.6822,
    lat: 18.2469,
    lng: 73.6822,
    category: 'Historic Fort',
    description:
      'Rajgad was the capital of Chhatrapati Shivaji Maharaj for many years. It is one of the most important forts in Maratha history and offers breathtaking views of the Sahyadri mountains.',
    best_for: 'History walks, fort trekking, Maratha heritage, and Sahyadri viewpoints',
    rating: 4.7,
    review_count: 3200,
    price: 0,
    entry_fee: 0,
    score: 9.2,
    has_ar: true,
    ar_model_url: '/models/rajgad-fort.gltf',
    has_ai_content: true,
    ai_content_available: true,
    image: '/images/rajgad-fort.jpg',
    images: ['/images/rajgad-fort.jpg', '/images/chor-darwaza.jpg', '/images/padmavati-talav.jpg'],
    videos: [],
    terrain: 'mountain',
    sections: [
      {
        id: 'overview',
        title: 'Overview',
        content:
          'Rajgad was the capital of Chhatrapati Shivaji Maharaj for many years. It is one of the most important forts in Maratha history and offers breathtaking views of the Sahyadri mountains.',
        image: '/images/rajgad-fort.jpg'
      },
      {
        id: 'chor-darwaza',
        title: 'Chor Darwaza',
        content:
          'Chor Darwaza is a secret entrance used for hidden movement and strategic escape during wartime. It reflects the smart military planning of the Marathas.',
        image: '/images/chor-darwaza.jpg'
      },
      {
        id: 'padmavati-talav',
        title: 'Padmavati Talav',
        content:
          'Padmavati Talav is a water reservoir that was used by soldiers and residents of the fort. It ensured water availability throughout the year.',
        image: '/images/padmavati-talav.jpg'
      }
    ]
  },
  sinhagad: {
    id: 'sinhagad',
    place_id: 'sinhagad',
    name: 'Sinhagad Fort',
    location_name: 'Pune, Maharashtra',
    latitude: 18.3663,
    longitude: 73.7559,
    lat: 18.3663,
    lng: 73.7559,
    category: 'Hill Fort',
    description:
      'Sinhagad is a hill fort known for the Battle of Sinhagad, sweeping valley views, and a popular Pune trekking route.',
    best_for: 'Short treks, monsoon views, fort history, and local food stalls',
    rating: 4.6,
    score: 9,
    has_ar: true,
    ar_model_url: '/models/sinhagad-fort.gltf',
    has_ai_content: true,
    ai_content_available: true,
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=900&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=900&auto=format&fit=crop&q=80'],
    videos: [],
    terrain: 'hill',
    sections: [
      {
        id: 'history',
        title: 'History',
        content:
          'Sinhagad is closely linked with Tanaji Malusare and the Maratha campaign to retake the fort. Its name remembers courage and sacrifice.',
        image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=900&auto=format&fit=crop&q=80'
      },
      {
        id: 'best-time',
        title: 'Best time',
        content:
          'Early mornings and post-monsoon months offer clearer views, cooler weather, and a more comfortable climb.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80'
      }
    ]
  },
  'shaniwar-wada': {
    id: 'shaniwar-wada',
    place_id: 'shaniwar-wada',
    name: 'Shaniwar Wada',
    location_name: 'Pune, Maharashtra',
    category: 'Heritage Palace',
    description:
      'Shaniwar Wada was the seat of the Peshwas and remains one of Pune city’s signature heritage landmarks.',
    best_for: 'Architecture, city heritage, evening visits, and photography',
    rating: 4.4,
    score: 8.8,
    has_ar: true,
    ar_model_url: '/models/shaniwar-wada.gltf',
    has_ai_content: true,
    ai_content_available: true,
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=900&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=900&auto=format&fit=crop&q=80'],
    videos: [],
    terrain: 'urban',
    sections: [
      {
        id: 'history',
        title: 'History',
        content:
          'Shaniwar Wada served as the Peshwa residence and administrative center, shaping Pune’s political and cultural memory.',
        image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?w=900&auto=format&fit=crop&q=80'
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content:
          'The remaining gates, walls, courtyards, and garden layout help visitors imagine the scale of the original palace complex.',
        image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=900&auto=format&fit=crop&q=80'
      }
    ]
  }
};

export function findPlaceContent(idOrName) {
  const key = String(idOrName || '').toLowerCase().replace(/\s+/g, '-');
  return PLACE_CONTENT[key] || Object.values(PLACE_CONTENT).find((place) => {
    const values = [place.id, place.place_id, place.name].map((value) => String(value || '').toLowerCase());
    return values.some((value) => value === key || value.replace(/\s+/g, '-') === key);
  }) || null;
}

export function clonePlaceContent(content) {
  if (!content) {
    return null;
  }

  return {
    ...content,
    images: [...(content.images || [])],
    videos: [...(content.videos || [])],
    sections: (content.sections || []).map((section) => ({ ...section })),
    ai_content: {
      description: content.description,
      summary: content.sections?.[0]?.content || content.description,
      images: [...(content.images || [])],
      videos: [...(content.videos || [])],
      ar_model_url: content.ar_model_url || ''
    }
  };
}
