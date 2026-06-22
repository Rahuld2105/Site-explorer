import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve('public/models');

const cubePositions = new Float32Array([
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
  -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
  0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5
]);

const cubeNormals = new Float32Array([
  0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
]);

const cubeIndices = new Uint16Array([
  0, 1, 2, 0, 2, 3,
  4, 5, 6, 4, 6, 7,
  8, 9, 10, 8, 10, 11,
  12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19,
  20, 21, 22, 20, 22, 23
]);

const palette = [
  [0.43, 0.35, 0.27, 1],
  [0.57, 0.48, 0.37, 1],
  [0.24, 0.38, 0.28, 1],
  [0.13, 0.20, 0.17, 1],
  [0.74, 0.28, 0.15, 1],
  [0.90, 0.72, 0.38, 1],
  [0.15, 0.30, 0.45, 1]
];

function writeBufferView(chunks, typedArray, target) {
  const byteOffset = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const buffer = Buffer.from(typedArray.buffer);
  chunks.push(buffer);

  return {
    bufferView: {
      buffer: 0,
      byteOffset,
      byteLength: buffer.byteLength,
      target
    },
    byteOffset
  };
}

function box(name, material, translation, scale) {
  return {
    name,
    material,
    translation,
    scale
  };
}

function makeFortPieces(style = 'mountain') {
  const base = style === 'urban' ? [0, -0.04, 0] : [0, -0.12, 0];
  const grassMaterial = style === 'urban' ? 1 : 2;

  return [
    box('terrain-base', grassMaterial, base, [3.8, 0.18, 2.9]),
    box('main-courtyard', 1, [0, 0.08, 0], [2.7, 0.18, 1.85]),
    box('front-wall', 0, [0, 0.35, 0.95], [2.9, 0.45, 0.16]),
    box('rear-wall', 0, [0, 0.35, -0.95], [2.9, 0.45, 0.16]),
    box('left-wall', 0, [-1.45, 0.35, 0], [0.16, 0.45, 1.95]),
    box('right-wall', 0, [1.45, 0.35, 0], [0.16, 0.45, 1.95]),
    box('main-gate', 4, [0, 0.42, 1.05], [0.55, 0.58, 0.18]),
    box('gate-arch', 5, [0, 0.82, 1.08], [0.72, 0.16, 0.22]),
    box('north-west-bastion', 0, [-1.45, 0.55, -0.95], [0.5, 0.85, 0.5]),
    box('north-east-bastion', 0, [1.45, 0.55, -0.95], [0.5, 0.85, 0.5]),
    box('south-west-bastion', 0, [-1.45, 0.55, 0.95], [0.5, 0.85, 0.5]),
    box('south-east-bastion', 0, [1.45, 0.55, 0.95], [0.5, 0.85, 0.5]),
    box('inner-shrine', 5, [-0.45, 0.35, -0.15], [0.58, 0.52, 0.46]),
    box('water-tank', 6, [0.62, 0.17, -0.25], [0.8, 0.12, 0.55]),
    box('lookout-step-1', 1, [-0.95, 0.18, 0.45], [0.65, 0.16, 0.42]),
    box('lookout-step-2', 1, [-0.95, 0.36, 0.45], [0.45, 0.16, 0.32])
  ];
}

const models = {
  'rajgad-fort': {
    name: 'Rajgad Fort AR model',
    pieces: [
      ...makeFortPieces('mountain'),
      box('sahyadri-ridge-left', 3, [-1.3, -0.02, 1.45], [1.4, 0.26, 0.38]),
      box('sahyadri-ridge-right', 3, [1.1, -0.03, 1.38], [1.7, 0.22, 0.36])
    ]
  },
  'sinhagad-fort': {
    name: 'Sinhagad Fort AR model',
    pieces: [
      ...makeFortPieces('mountain'),
      box('trek-path', 5, [-0.15, 0.02, 1.48], [0.42, 0.05, 1.05]),
      box('viewpoint-platform', 1, [1.05, 0.35, 0.35], [0.82, 0.22, 0.55])
    ]
  },
  'shaniwar-wada': {
    name: 'Shaniwar Wada AR model',
    pieces: [
      box('garden-base', 2, [0, -0.04, 0], [3.8, 0.12, 2.6]),
      box('palace-floor', 1, [0, 0.06, 0], [3.0, 0.12, 1.85]),
      box('front-gate-left', 0, [-0.72, 0.62, 0.95], [0.55, 1.15, 0.26]),
      box('front-gate-right', 0, [0.72, 0.62, 0.95], [0.55, 1.15, 0.26]),
      box('front-gate-top', 0, [0, 1.16, 0.95], [1.65, 0.28, 0.3]),
      box('wooden-door', 4, [0, 0.48, 1.08], [0.7, 0.82, 0.12]),
      box('left-range', 0, [-1.34, 0.45, 0], [0.32, 0.78, 1.85]),
      box('right-range', 0, [1.34, 0.45, 0], [0.32, 0.78, 1.85]),
      box('rear-range', 0, [0, 0.45, -0.88], [2.95, 0.78, 0.32]),
      box('courtyard-water', 6, [0, 0.15, -0.08], [0.88, 0.08, 0.62]),
      box('lamp-left', 5, [-0.45, 0.46, 0.35], [0.14, 0.8, 0.14]),
      box('lamp-right', 5, [0.45, 0.46, 0.35], [0.14, 0.8, 0.14]),
      box('roof-band', 5, [0, 0.91, -0.88], [3.2, 0.18, 0.4])
    ]
  }
};

function createGltf(model) {
  const chunks = [];
  const positionView = writeBufferView(chunks, cubePositions, 34962);
  const normalView = writeBufferView(chunks, cubeNormals, 34962);

  if (chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0) % 4 !== 0) {
    chunks.push(Buffer.alloc(2));
  }

  const indexView = writeBufferView(chunks, cubeIndices, 34963);
  const buffer = Buffer.concat(chunks);
  const bufferUri = `data:application/octet-stream;base64,${buffer.toString('base64')}`;

  return {
    asset: {
      version: '2.0',
      generator: 'TourVision local AR placeholder generator'
    },
    scene: 0,
    scenes: [
      {
        nodes: model.pieces.map((_, index) => index)
      }
    ],
    nodes: model.pieces.map((piece, index) => ({
      name: piece.name,
      mesh: piece.material,
      translation: piece.translation,
      scale: piece.scale,
      extras: {
        pieceIndex: index
      }
    })),
    meshes: palette.map((_, materialIndex) => ({
      name: `box-material-${materialIndex}`,
      primitives: [
        {
          attributes: {
            POSITION: 0,
            NORMAL: 1
          },
          indices: 2,
          material: materialIndex
        }
      ]
    })),
    materials: palette.map((color, index) => ({
      name: `tourvision-material-${index}`,
      pbrMetallicRoughness: {
        baseColorFactor: color,
        metallicFactor: 0,
        roughnessFactor: 0.82
      }
    })),
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 24,
        type: 'VEC3',
        min: [-0.5, -0.5, -0.5],
        max: [0.5, 0.5, 0.5]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 24,
        type: 'VEC3'
      },
      {
        bufferView: 2,
        byteOffset: 0,
        componentType: 5123,
        count: cubeIndices.length,
        type: 'SCALAR'
      }
    ],
    bufferViews: [positionView.bufferView, normalView.bufferView, indexView.bufferView],
    buffers: [
      {
        uri: bufferUri,
        byteLength: buffer.byteLength
      }
    ]
  };
}

fs.mkdirSync(outputDir, { recursive: true });

for (const [fileName, model] of Object.entries(models)) {
  const filePath = path.join(outputDir, `${fileName}.gltf`);
  fs.writeFileSync(filePath, `${JSON.stringify(createGltf(model), null, 2)}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), filePath)}`);
}
