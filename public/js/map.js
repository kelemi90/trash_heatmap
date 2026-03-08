const MAP_WIDTH = 1655
const MAP_HEIGHT = 2339

function screenToMap(x,y,mapElement){

const rect = mapElement.getBoundingClientRect()

const scaleX = MAP_WIDTH / rect.width
const scaleY = MAP_HEIGHT / rect.height

return {
x: Math.round(x * scaleX),
y: Math.round(y * scaleY)
}

}

function mapToScreen(x,y,mapElement){

const rect = mapElement.getBoundingClientRect()

const scaleX = rect.width / MAP_WIDTH
const scaleY = rect.height / MAP_HEIGHT

return {
x: x * scaleX,
y: y * scaleY
}

}