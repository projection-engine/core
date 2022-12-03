import Component from "../../templates/components/Component";

export default [
    Component.group("CENTER_POINT", [
        Component.array(["X", "Y", "Z"], "center",  undefined, undefined, undefined, false, undefined, [0, 0, 0])
    ]),

    Component.group("INTENSITY_COLOR", [
        Component.color("COLOR", "color"),
        Component.number("INTENSITY", "intensity", 100, 0),
    ]),


    Component.group("SHADOWS", [
        Component.boolean("ENABLED", "shadowMap"),
        Component.number("SIZE", "size", undefined, 1, undefined, false, v => !v.shadowMap),
        Component.number("FAR", "zFar", undefined, undefined, .001, false, true, v => !v.shadowMap),
        Component.number("NEAR", "zNear", undefined, undefined, .001, false, true, v => !v.shadowMap),
        Component.number("BIAS", "shadowBias", undefined, undefined, .00001),
        Component.number("PCF_SAMPLES", "pcfSamples", 10, 1, 1, false, false, v => !v.shadowMap),
        Component.number("FALLOFF", "shadowAttenuationMinDistance", undefined, 1, undefined, false, false, v => !v.shadowMap),
        Component.boolean("HAS_SSS", "hasSSS")

    ]),



]