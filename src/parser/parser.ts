import fs from "fs";
import {
    addEdge,
    EdgeMatrix,
    multiply,
    multiplyEdgeMatrix, PolygonMatrix,
    toInteger,
    toMatrixString
} from "../matrix";
import {
    toIdentity,
    toMove,
    toRotate,
    TransformationTypes,
    Axis,
    toScale,
    Transformer,
    createTransformer, deepCopyTransformer
} from "../transformations";
import Image from "../image";
import {bezierCurve, drawCircle, hermiteCurve, drawBox, drawSphere, drawTorus} from "../render/draw";
import {objParser} from "./obj-parser";

export function *getInstructions(fileName: string): IterableIterator<string>{
    const lines: string[] = fs.readFileSync(fileName, "utf-8").split("\n");
    let lineNumber = 0;
    while(lineNumber < lines.length){
        yield lines[lineNumber];
        lineNumber++;
    }
}

/**
 * Line drawing instructions. Each instruction is one line long. The subsequent lines are parameters if the given
 * instruction requires parameters.
"line":
 - Parameter "<x0> <y0> <z0> <x1> <y1> <z1>"
 - Adds the given points to the edge matrix
"ident":
 - Sets the transform matrix to the identity matrix
"scale":
 - Parameter: "<scaleX> <scaleY> <scaleZ>"
 - Creates a scale matrix then multiplies the transform matrix by the scale matrix.
"move":
 - Parameter: "<moveX> <moveY> <moveZ>"
 - Creates a translation matrix and multiplies the transform matrix by the translation matrix
"rotate":
 - Parameter: "<x|y|z> <degrees>"
 - Creates a rotation matrix and multiples the transform matrix by the rotate matrix
"display":
 - Clears the image, then render the lines from edge matrix, then display to the screen for the user to see
"save":
 - Parameter: "<file name>"
 - Clears the image, then render the lines from edge matrix, then save the image to disk
"quit":
 - Stops parsing
"apply":
 - Multiplies the edge matrix by the transformation matrix
"#":
"<blank line>":
 - Ignore the given line

 * @param fileName
 * @param edgeMatrix
 * @param polygonMatrix
 * @param transformer
 * @param image
 */
const parser = (fileName: string, edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image) => {
    const instructions = getInstructions(fileName);
    const transformationStack: Transformer[] = [createTransformer()];

    let instruction: string = instructions.next().value;
    while(instruction !== undefined){
        const transformerPeekStack = transformationStack[transformationStack.length - 1];

        // Comments start with '#'
        if(instruction.startsWith("#")){
            instruction = instructions.next().value;
            continue;
        }

        switch(instruction){
            case 'bezier': bezier(instructions.next().value, edgeMatrix); break;
            case 'box': box(instructions.next().value, polygonMatrix, transformerPeekStack, image); break; //
            case 'circle': circle(instructions.next().value, edgeMatrix); break;
            case 'clear': clear(edgeMatrix, polygonMatrix, image); break;
            case 'display': display(image, edgeMatrix); break;
            case 'hermite': hermite(instructions.next().value, edgeMatrix); break;
            case 'ident': ident(transformerPeekStack); break;
            case 'line': line(instructions.next().value, edgeMatrix); break;
            case TransformationTypes.move: move(instructions.next().value, transformerPeekStack); break;
            case TransformationTypes.rotate: rotate(instructions.next().value, transformerPeekStack); break;
            case TransformationTypes.scale: scale(instructions.next().value, transformerPeekStack); break;
            case 'obj': obj(instructions.next().value, polygonMatrix, transformerPeekStack, image); break;
            case 'pop': pop(transformationStack); break;
            case 'push': push(transformationStack); break;
            case 'save': save(instructions.next().value, image, edgeMatrix, polygonMatrix); break;
            case 'sphere': sphere(instructions.next().value, polygonMatrix, transformerPeekStack, image); break; //
            case 'torus': torus(instructions.next().value, polygonMatrix, transformerPeekStack, image); break;  //
            case ' ': case '': case '\n': break; // Ignore new lines
            default: throw new Error(`Do not understand '${instruction}'`);
        }

        instruction = instructions.next().value;
    }
};

function bezier(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, x1, y1, x2, y2, x3, y3] = parameter.split(" ").map(val => parseInt(val));
    bezierCurve(x0, y0, x1, y1, x2, y2, x3, y3, edgeMatrix);
}

function box(parameter: string, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    const [x, y, z, width, height, depth] = parameter.split(" ").map(val => parseInt(val));
    drawBox(x, y, z, width, height, depth, polygonMatrix);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix);
}

function circle(parameter: string, edgeMatrix: EdgeMatrix){
    const [cx, cy, cz, r] = parameter.split(" ").map(val => parseInt(val));
    drawCircle(cx, cy, r, edgeMatrix);
}

function clear(edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix, image: Image){
    edgeMatrix.length = 0;
    polygonMatrix.length = 0;
    image.clear();
}

function display(image: Image, edgeMatrix: EdgeMatrix){
    toInteger(edgeMatrix);
    image.drawEdges(edgeMatrix);
    image.display();
}

function hermite(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, x1, y1, rx0, ry0, rx1, ry1] = parameter.split(" ").map(val => parseInt(val));
    hermiteCurve(x0, y0, x1, y1, rx0, ry0, rx1, ry1, edgeMatrix);
}

function ident(transformer: Transformer){
    toIdentity(transformer);
}

function line(parameter: string, edgeMatrix: EdgeMatrix){
    const [x0, y0, z0, x1, y1, z1] = parameter.split(" ").map(value => parseInt(value));
    addEdge(edgeMatrix, [x0, y0, z0], [x1, y1, z1]);
}

function move(parameter: string, transformer: Transformer){
    const [x, y, z] = parameter.split(" ").map(value => parseInt(value));

    toMove(transformer, x, y, z);
}

function rotate(parameter: string, transformer: Transformer){
    const parameters = parameter.split(" ");
    const degrees = parseFloat(parameters[1]);
    let axis = parameters[0] as keyof typeof Axis;
    toRotate(transformer, degrees, Axis[axis]);
}

function scale(parameter: string, transformer: Transformer){
    const [x, y, z] = parameter.split(" ").map(value => parseFloat(value));
    toScale(transformer, x, y, z);
}

function sphere(parameter: string, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    const [x, y, z, radius] = parameter.split(" ").map(value => parseInt(value));
    drawSphere(polygonMatrix, x, y, z, radius);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix);
}

function torus(parameter: string, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    const [x, y, z, radius1, radius2] = parameter.split(" ").map(value => parseInt(value));
    drawTorus(polygonMatrix, x, y, z, radius1, radius2);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix);
}

function obj(fileName: string, polygonMatrix: PolygonMatrix, transformer: Transformer, image: Image){
    objParser(fileName, polygonMatrix);
    multiplyEdgeMatrix(transformer, polygonMatrix);
    draw(image, polygonMatrix);
}

function pop(transformationStack: Transformer[]){
    transformationStack.pop();
}

function push(transformationStack: Transformer[]){
    // push deep copy on
    const peekStack: Transformer = transformationStack[transformationStack.length - 1];
    transformationStack.push(deepCopyTransformer(peekStack));
}

function save(parameter: string, image: Image, edgeMatrix: EdgeMatrix, polygonMatrix: PolygonMatrix){
    image.saveToDisk(parameter);
    image.clear();
}

function draw(image: Image, polygonMatrix: PolygonMatrix){
    toInteger(polygonMatrix);
    image.drawPolygons(polygonMatrix);
    // clear polygon drawn
    polygonMatrix.length = 0;
}

export default parser;