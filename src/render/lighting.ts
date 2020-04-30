import {dotProduct, normalizeVector, scaleVector, subtractVector, Vector} from "../utility/math-utility";

// the vector the user is looking from
export const viewingVector: Vector = [0, 0, 1];

// light
export const lightVector: Vector = [0.5, 0.75, 1];

// color of light
// value range from [0, 255]
export type Color = {
    red: number,
    green: number,
    blue: number
}
export const ambientLightColor: Color = {
    red: 50,
    green: 50,
    blue: 50
};
export const pointLightColor: Color = {
    red: 0,
    green: 255,
    blue: 255
};

// Reflection constants
export type ReflectionConstants = number; // valid values are (0, 1)
export const ambientReflection: ReflectionConstants = .1;
export const diffuseReflection: ReflectionConstants = .5;
export const specularReflection: ReflectionConstants = .5;

export function calculateColor(surfaceNormal: Vector): String{
    const normalizedLightVector = normalizeVector(lightVector);
    const normalizedSurfaceNormal = normalizeVector(surfaceNormal);

    const diffuseReflectionFactor = Math.max(dotProduct(normalizedSurfaceNormal, normalizedLightVector), 0);

    // color = ambientColor + diffuseColor + specularColor
    const red = ambientLightColor.red * ambientReflection
        + pointLightColor.red * diffuseReflection * (diffuseReflectionFactor);
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.red);
    const green = ambientLightColor.green * ambientReflection
        + pointLightColor.green * diffuseReflection * (diffuseReflectionFactor)
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.green);
    const blue = ambientLightColor.blue * ambientReflection
        + pointLightColor.blue * diffuseReflection * (diffuseReflectionFactor)
        + calculateSpecularColorValue(normalizedSurfaceNormal, normalizedLightVector, pointLightColor.blue);

    if((red > 255 || green > 255 || blue > 255)){
        console.log('bad');
    }

    return `${Math.floor(red)} ${Math.floor(green)} ${Math.floor(blue)}`;
}

function calculateSpecularColorValue(normalizedSurfaceNormal: Vector, normalizedLightVector: Vector, colorValue: number): number {
    const reflectionVector = subtractVector(scaleVector(normalizedSurfaceNormal, 2 * dotProduct(normalizedSurfaceNormal, normalizedLightVector)), normalizedLightVector);
    const factor = dotProduct(reflectionVector, normalizeVector(viewingVector));
    if(factor < 0){
        // no reflection
        return 0;
    }
    return colorValue * specularReflection * Math.pow(factor, 4);
}