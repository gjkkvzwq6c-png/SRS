/* ── VORTEX Game Configuration ── */
'use strict';

const CFG = {
  WORLD_W: 5120,
  WORLD_H: 4096,

  /* Tornado growth stages */
  STAGES: [
    { id:0, name:'Dust Devil',    ef:'EF0', mass:0,      w:28,  h:90,  speed:165, range:90,  force:130,  debrisMax:18,  rainAlpha:0.10, skyDark:0.00, lightFreq:0.002, windSpeed:1.0 },
    { id:1, name:'Landspout',     ef:'EF1', mass:300,    w:48,  h:150, speed:185, range:140, force:240,  debrisMax:30,  rainAlpha:0.20, skyDark:0.15, lightFreq:0.004, windSpeed:1.3 },
    { id:2, name:'Funnel Cloud',  ef:'EF2', mass:1200,   w:76,  h:230, speed:205, range:200, force:400,  debrisMax:50,  rainAlpha:0.32, skyDark:0.28, lightFreq:0.008, windSpeed:1.7 },
    { id:3, name:'EF1 Tornado',   ef:'EF1', mass:4000,   w:115, h:340, speed:220, range:280, force:620,  debrisMax:75,  rainAlpha:0.44, skyDark:0.42, lightFreq:0.015, windSpeed:2.1 },
    { id:4, name:'EF2 Tornado',   ef:'EF2', mass:13000,  w:170, h:470, speed:235, range:380, force:950,  debrisMax:105, rainAlpha:0.55, skyDark:0.55, lightFreq:0.025, windSpeed:2.6 },
    { id:5, name:'EF3 Tornado',   ef:'EF3', mass:40000,  w:250, h:620, speed:248, range:500, force:1400, debrisMax:140, rainAlpha:0.65, skyDark:0.67, lightFreq:0.04,  windSpeed:3.2 },
    { id:6, name:'EF4 Tornado',   ef:'EF4', mass:120000, w:360, h:800, speed:258, range:660, force:2000, debrisMax:180, rainAlpha:0.75, skyDark:0.78, lightFreq:0.06,  windSpeed:3.9 },
    { id:7, name:'EF5 Monster',   ef:'EF5', mass:350000, w:520, h:980, speed:265, range:860, force:2900, debrisMax:220, rainAlpha:0.85, skyDark:0.90, lightFreq:0.09,  windSpeed:4.8 },
  ],

  /* Object types — mass, min stage to absorb, size, hp, color, shape */
  OBJ: {
    LEAF:       { label:'Leaf',        mass:2,     stage:0, sz:9,   hp:1,  color:'#4a8a24', shape:'leaf',    points:5    },
    TRASH:      { label:'Trash',       mass:5,     stage:0, sz:11,  hp:1,  color:'#8a8060', shape:'box',     points:10   },
    SIGN:       { label:'Sign',        mass:12,    stage:0, sz:14,  hp:2,  color:'#c8a030', shape:'sign',    points:20   },
    CHAIR:      { label:'Lawn Chair',  mass:18,    stage:0, sz:15,  hp:2,  color:'#e06028', shape:'box',     points:30   },
    FENCE:      { label:'Fence Post',  mass:8,     stage:0, sz:10,  hp:1,  color:'#b07830', shape:'post',    points:15   },
    TREE:       { label:'Tree',        mass:55,    stage:1, sz:28,  hp:6,  color:'#226018', shape:'tree',    points:80   },
    SHED:       { label:'Shed',        mass:110,   stage:1, sz:38,  hp:10, color:'#7a7858', shape:'shed',    points:150  },
    CAR:        { label:'Car',         mass:180,   stage:1, sz:32,  hp:12, color:'#3055a8', shape:'car',     points:220  },
    POLE:       { label:'Power Pole',  mass:70,    stage:1, sz:12,  hp:7,  color:'#604020', shape:'post',    points:100  },
    TRACTOR:    { label:'Tractor',     mass:280,   stage:2, sz:44,  hp:18, color:'#b04010', shape:'car',     points:350  },
    PROPANE:    { label:'Propane Tank',mass:90,    stage:2, sz:22,  hp:8,  color:'#b0c0c8', shape:'tank',    points:180  },
    HOUSE:      { label:'House',       mass:700,   stage:3, sz:68,  hp:35, color:'#c07858', shape:'house',   points:900  },
    TRUCK:      { label:'Semi Truck',  mass:550,   stage:3, sz:75,  hp:28, color:'#506890', shape:'truck',   points:700  },
    BARN:       { label:'Barn',        mass:820,   stage:3, sz:80,  hp:40, color:'#a03518', shape:'barn',    points:1100 },
    TRAINCAR:   { label:'Train Car',   mass:1100,  stage:4, sz:95,  hp:45, color:'#484858', shape:'truck',   points:1500 },
    TOWER:      { label:'Water Tower', mass:950,   stage:4, sz:82,  hp:48, color:'#6888a0', shape:'tower',   points:1300 },
    FACTORY:    { label:'Factory',     mass:4500,  stage:5, sz:135, hp:90, color:'#585868', shape:'factory', points:5000 },
    SKYSCRAPER: { label:'Skyscraper',  mass:10000, stage:6, sz:105, hp:110,color:'#6878a0', shape:'skyscraper',points:12000 },
    AIRPLANE:   { label:'Airplane',    mass:6500,  stage:7, sz:115, hp:70, color:'#c8ccd8', shape:'plane',   points:9000 },
    STADIUM:    { label:'Stadium',     mass:15000, stage:7, sz:150, hp:130,color:'#608860', shape:'factory', points:18000},
  },

  /* Map zone definitions — world x/y in world coords */
  ZONES: [
    { id:'farm',    label:'Farmland',           x:200,  y:2200, w:1600, h:1700, color:'#2d3d18' },
    { id:'trailer', label:'Trailer Park',        x:1900, y:2600, w:1000, h:1000, color:'#3d3420' },
    { id:'suburb',  label:'Suburbs',             x:3100, y:2200, w:1700, h:1700, color:'#303828' },
    { id:'gas',     label:'Gas Station',         x:2000, y:1700, w:600,  h:600,  color:'#2a2a1a' },
    { id:'factory', label:'Industrial Zone',     x:600,  y:600,  w:1600, h:1400, color:'#282828' },
    { id:'city',    label:'Downtown',            x:2600, y:400,  w:2300, h:1600, color:'#1e1e2a' },
  ],

  AUDIO: { MASTER_VOLUME: 0.65 },

  CAMERA_LERP:  0.08,
  MINIMAP_SCALE: 0.031,
  MAX_PARTICLES: 1800,
  MAX_DEBRIS:    260,
  MAX_RAIN:      700,
  SAVE_KEY:      'vortex_save_v1',
};
