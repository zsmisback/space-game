const canvasWidth = 640;
const canvasHeight = 480;
const playerWidth = 30;
const playerHeight = 30;
const border = 5;
const infoBar = 45;
const canvasDetails = {
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight,
    fieldMinX: (canvasWidth / 2) - (canvasWidth - 10) / 2,
    fieldMinY: (canvasHeight / 2) - (canvasHeight - 100) / 2,
    fieldWidth: canvasWidth - (border * 2),
    fieldHeight: (canvasHeight - infoBar) - (border * 2),
    fieldMaxX: (canvasWidth - playerWidth) - border,
    fieldMaxY: (canvasHeight - playerHeight) - border,
    canvasSpeed: 220
};
const generateStartPos = (min, max, multiple) => {
    return Math.floor(Math.random() * ((max - min) / multiple)) * multiple + min;
};
export { canvasDetails, generateStartPos };
