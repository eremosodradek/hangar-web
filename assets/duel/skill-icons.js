/* tools/skill-icons-build.js 생성 */
(function () {
  'use strict';
  const paths = {
    "sk-cat-i": "<path fill=\"none\" stroke=\"currentColor\" d=\"M4 11.5C4.5 6.4 7.8 3.5 12 3.5C20 3.5 23 12.5 17.5 19.2\"/><path fill=\"none\" stroke=\"currentColor\" d=\"M4 16.7L4.5 15 M8.1 20Q9.5 17.3 9.5 12.5C9.5 8.1 15.5 8.1 15.5 12.5Q15.5 17.5 12.8 21\"/>",
    "sk-striker-a": "<polygon points=\"1.2,11 10.2,3.33 15.2,2.33 14.2,7.33 5.2,15\"/><polygon points=\"11.8,19 18.9,11 22.9,10 21.9,15 14.8,23\"/>",
    "sk-striker-p": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"2.1,8.3 5.8,12 2.1,15.7\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"7.5,7.5 12,12 7.5,16.5\"/><polygon fill=\"none\" stroke=\"currentColor\" points=\"22.2,12 22.09,12.83 21.77,13.6 21.26,14.26 20.6,14.77 19.83,15.09 19,15.2 18.17,15.09 17.4,14.77 16.74,14.26 16.23,13.6 15.91,12.83 15.8,12 15.91,11.17 16.23,10.4 16.74,9.74 17.4,9.23 18.17,8.91 19,8.8 19.83,8.91 20.6,9.23 21.26,9.74 21.77,10.4 22.09,11.17\"/>",
    "sk-pathfinder-a": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"17.8,12 17.6,13.5 17.02,14.9 16.1,16.1 14.9,17.02 13.5,17.6 12,17.8 10.5,17.6 9.1,17.02 7.9,16.1 6.98,14.9 6.4,13.5 6.2,12 6.4,10.5 6.98,9.1 7.9,7.9 9.1,6.98 10.5,6.4 12,6.2 13.5,6.4 14.9,6.98 16.1,7.9 17.02,9.1 17.6,10.5 17.8,12\"/><path fill=\"none\" stroke=\"currentColor\" d=\"M19.49 16.32L22.74 18.2 M7.68 19.49L5.8 22.74 M4.51 7.68L1.26 5.8 M16.32 4.51L18.2 1.26\"/>",
    "sk-pathfinder-p": "<path fill=\"none\" stroke=\"currentColor\" d=\"M2.5 15.8Q7 5 12.2 5.8Q17.5 5.2 21.5 8.2Q18.1 18 12 18.1Q7 19 2.5 15.8Z\"/><circle cx=\"12\" cy=\"12\" r=\"3.05\"/>",
    "sk-jammer-a": "<polygon points=\"1.8,16.8 7.5,6 12.5,13 16.5,4 22.2,14.4 18.7,16.7 16.7,12.7 12.8,20 7.8,13.7 5.3,18.8\"/>",
    "sk-jammer-p": "<path fill=\"none\" stroke=\"currentColor\" d=\"M2.5 8.5Q9.8 2.3 17.5 5.7 M20.6 7.2L21.8 8.5 M5.8 12.1Q10 8.6 13.6 9.5 M9.2 16Q10 15.2 11 15\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"19.2,3 6.8,21\"/>",
    "sk-carrier-a": "<path fill=\"none\" stroke=\"currentColor\" d=\"M10 2.2L15 5V11L10 13.5L5 11V5Z M5 5L10 7.6L15 5 M10 7.6V13.5\"/><polygon points=\"12,15.4 16.6,15.4 16.6,12 22,17 16.6,22 16.6,18.6 12,18.6\"/>",
    "sk-carrier-p": "<path d=\"M2 19.5C3.5 11 8.5 7.8 15 7.8V4.1L22 9.8L15 15.8V12C9.5 12 6.5 15.5 5.7 20Z\"/>",
    "sk-medic-a": "<polygon points=\"16,3 14,6.5 16.5,9 20.5,6 20,11 17,13.5 13,13 6,21 3,18 10,10 10,6 12.5,3.5\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"16.3,18.5 21.7,18.5\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"19,15.8 19,21.2\"/>",
    "sk-medic-p": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"18.15,17.44 16.49,19.11 14.44,20.27 12.16,20.85 9.8,20.79 7.55,20.1 5.56,18.83 3.99,17.07 2.95,14.96 2.51,12.65 2.71,10.3 3.53,8.09 4.92,6.18 6.76,4.72 8.93,3.8 11.27,3.5 13.6,3.84\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"10.1,2.4 13.6,3.84 11.8,7\"/><path fill=\"none\" stroke=\"currentColor\" d=\"M11.2 8.3V16.5 M8.5 12.4H13.9\"/>",
    "sk-hauler-a": "<polygon points=\"2.3,5 4.7,3.3 14,3.3 9.5,6 9.5,12.5 12.8,17 4.7,17 2.3,15\"/><polygon fill=\"none\" stroke=\"currentColor\" points=\"16,5 21.5,7.2 21.5,13.8 16,20.5 10.5,13.8 10.5,7.2\"/>",
    "sk-hauler-p": "<path fill=\"none\" stroke=\"currentColor\" d=\"M12 2.8V7.2C12 9.8 16.3 9.4 16.3 12.6C16.3 15.4 12.8 16 11.4 13.3\"/><polygon points=\"2.2,16.4 8.2,11.6 12.4,16.5 20.2,17.4 17.5,21 5.5,21\"/>",
    "sk-bulwark-a": "<polygon fill=\"none\" stroke=\"currentColor\" points=\"12,3 16.5,5.5 16.5,13 12,20.5 7.5,13 7.5,5.5\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"1.7,7.8 4.3,11 1.7,14.2\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"22.3,7.8 19.7,11 22.3,14.2\"/>",
    "sk-bulwark-p": "<polygon fill=\"none\" stroke=\"currentColor\" points=\"8,8.2 13.3,10.7 13.3,15.7 8,21 2.7,15.7 2.7,10.7\"/><polygon points=\"13,11 17.8,6.2 15.5,3.8 22.5,2 21.3,9.3 19.9,7.9 15.2,13.2\"/>",
    "sk-siege-a": "<path fill=\"none\" stroke=\"currentColor\" d=\"M2 13.5C5.2 2.2 14.4 0.8 18.4 11\"/><polygon points=\"18.3,12.7 19.9,15.7 23,16.4 20.9,18.8 21.4,22 18.3,20.7 15.2,22 15.5,18.8 13.4,16.4 16.7,15.7\"/>",
    "sk-siege-p": "<path fill=\"none\" stroke=\"currentColor\" d=\"M9.4 2.5V11.4 M9.4 17.2V21.5\"/><polygon points=\"4.2,12.1 18,12.1 22.2,14.3 18,16.5 4.2,16.5\"/>",
    "sk-flagship-a": "<polygon points=\"5.3,10 2,7 2,2.7 6.2,4.1 9.1,7.3\"/><polygon points=\"9.7,15.8 9.7,9.5 12,5.4 14.3,9.5 14.3,15.8\"/><polygon points=\"14.9,7.3 17.8,4.1 22,2.7 22,7 18.7,10\"/>",
    "sk-flagship-p": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"4,3 4,21\"/><path d=\"M5 4.1C10 1.2 14 6.9 21.6 4L19.4 8.1L21.6 11.2C14.6 14.1 10.2 9.4 5 12.3Z\"/>",
    "sk-breacher-a": "<path fill=\"none\" stroke=\"currentColor\" d=\"M14 2.7H20.8V9.9 M20.8 19.1V21.3H14\"/><polygon points=\"4.2,9.5 22.5,14.5 4.2,19.5 8,14.5\"/>",
    "sk-breacher-p": "<polygon points=\"4,10 12,2 20,10 20,13.5 12,7 4,13.5\"/><polygon points=\"4,17.5 12,10 20,17.5 20,21 12,14.6 4,21\"/>",
    "sk-phalanx-a": "<path d=\"M1 9.3L3.6 8.1L6.2 9.3V14.8L3.6 17.5L1 14.8Z M17.8 9.3L20.4 8.1L23 9.3V14.8L20.4 17.5L17.8 14.8Z\"/><polygon fill=\"none\" stroke=\"currentColor\" points=\"12,3.1 15.2,4.8 15.2,14.1 12,19.2 8.8,14.1 8.8,4.8\"/>",
    "sk-phalanx-p": "<polygon points=\"1.5,9.1 6.5,9.1 6.5,13 9.5,13 9.5,9.1 14.5,9.1 14.5,13 17.5,13 17.5,9.1 22.5,9.1 22.5,18.5 1.5,18.5\"/>",
    "sk-ins-atk": "<polygon points=\"12,1.7 22,9.4 14.15,9.4 14.15,14 9.85,14 9.85,9.4 2,9.4\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"3,16.8 3,21.5 21,21.5 21,16.8\"/>",
    "sk-ins-guard": "<path fill=\"none\" stroke=\"currentColor\" d=\"M2.4 8.2Q8 8.2 12 4.4Q16 8.2 21.6 8.2Q20.7 15.3 12 19.3Q3.3 15.3 2.4 8.2Z\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"8.8,11.8 15.2,11.8\"/>",
    "sk-ins-counter": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"12,5 17.5,5 20,7.5 20,12 17.5,14.5 5,14.5\"/><polygon points=\"9,9 2,14.5 9,20\"/>",
    "sk-ins-pierce": "<polyline fill=\"none\" stroke=\"currentColor\" points=\"15.58,14.7 14.56,16.45 13.11,17.84 11.32,18.78 9.34,19.19 7.33,19.03 5.44,18.31 3.82,17.1 2.6,15.49\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"2.6,8.51 3.82,6.9 5.44,5.69 7.33,4.97 9.34,4.81 11.32,5.22 13.11,6.16 14.56,7.55 15.58,9.3\"/><polygon points=\"1.7,10.6 17.5,10.6 17.5,7.2 22.7,12 17.5,16.8 17.5,13.4 1.7,13.4\"/>",
    "sk-ins-heal": "<polygon points=\"9.65,2.2 14.35,2.2 14.35,9.65 21.8,9.65 21.8,14.35 14.35,14.35 14.35,21.8 9.65,21.8 9.65,14.35 2.2,14.35 2.2,9.65 9.65,9.65\"/>",
    "sk-ins-cleanse": "<polygon fill=\"none\" stroke=\"currentColor\" points=\"3,13.5 12.5,4 20,11.5 12.5,19 8.5,19\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"7.5,9 15,16.5\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"13,19 21.5,19\"/>",
    "sk-ins-move": "<polygon points=\"3,17.5 9.8,7.3 22,4 16.3,14 11.1,13.5 6.2,19.6\"/><polyline fill=\"none\" stroke=\"currentColor\" points=\"12.2,17.6 17.5,16.4\"/>",
    "sk-ins-aim": "<path fill=\"none\" stroke=\"currentColor\" d=\"M4 5.2V10.3Q4 17.1 12 20.3Q20 17.1 20 10.3V5.2\"/><circle cx=\"12\" cy=\"10\" r=\"2.8\"/>",
    "sk-ins-jam": "<polygon points=\"2.4,5 8,5 10.7,11 7.2,10 4.2,13.4 2.4,13.4\"/><polygon points=\"21.6,19 16,19 13.3,13 16.8,14 19.8,10.6 21.6,10.6\"/>",
    "sk-ins-extra": "<polygon points=\"2,13.8 7.1,4.5 9.2,4.5 9.2,9.4 11.7,9.4 6.4,18.6 4.2,18.6 4.2,13.8\"/><polygon points=\"11.1,17.1 16.5,7.5 18.7,7.5 18.7,12.4 22,12.4 16.4,22 14.2,22 14.2,17.1\"/>",
    "sk-ins-resist": "<path fill=\"none\" stroke=\"currentColor\" d=\"M16.8 3.6Q23.2 12 16.8 20.4\"/><polygon points=\"12.6,9 7.9,9 7.9,5.9 2.2,12 7.9,18.1 7.9,15 12.6,15\"/>"
  };
  window.skillIcon = function (id) {
    if (typeof id !== 'string' || !Object.hasOwn(paths, id)) return '';
    return '<svg data-ski="' + id + '" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + paths[id] + '</svg>';
  };
})();
