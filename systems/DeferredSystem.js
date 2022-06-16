import System from "../basic/System"

import SYSTEMS from "../templates/SYSTEMS"
import ShaderInstance from "../instances/ShaderInstance"
import * as shaderCode from "../shaders/mesh/DEFERRED.glsl"

export default class DeferredSystem extends System {

    constructor(gpu) {
        super()
        this.gpu = gpu
        this.deferredShader = new ShaderInstance(shaderCode.vertex, shaderCode.fragment, gpu)
    }

    execute(options, systems, data, giGridSize, giFBO) {
        super.execute()
        if (this.aoTexture === undefined && systems[SYSTEMS.AO])
            this.aoTexture = systems[SYSTEMS.AO].texture
        const {
            pointLightsQuantity,
            maxTextures,
            directionalLightsData,
            dirLightPOV,
            pointLightData,
            skylight,
        } = data

        const {
            ao,
            camera,
            pcfSamples
        } = options
        super.execute()
        const shadowMapSystem = systems[SYSTEMS.SHADOWS],
            deferredSystem = systems[SYSTEMS.MESH]

        const mutableData = {shadowMapResolution: 1, shadowMapsQuantity: 1, indirectLightAttenuation: 1}
        if (shadowMapSystem) {
            mutableData.shadowMapResolution = shadowMapSystem.maxResolution
            mutableData.shadowMapsQuantity = shadowMapSystem.maxResolution / shadowMapSystem.resolutionPerTexture
        }




        if (skylight) {
            directionalLightsData.push(skylight)
            mutableData.indirectLightAttenuation = skylight?.attenuation
        }

        this.deferredShader.use()
        this.deferredShader.bindForUse({
            positionSampler: deferredSystem.frameBuffer.colors[0],
            normalSampler: deferredSystem.frameBuffer.colors[1],
            albedoSampler: deferredSystem.frameBuffer.colors[2],
            behaviourSampler: deferredSystem.frameBuffer.colors[3],
            ambientSampler: deferredSystem.frameBuffer.colors[4],
            shadowMapTexture: shadowMapSystem?.shadowsFrameBuffer?.depthSampler,
            redIndirectSampler: giFBO?.colors[0],
            greenIndirectSampler: giFBO?.colors[1],
            blueIndirectSampler: giFBO?.colors[2],

            aoSampler: this.aoTexture,

            shadowCube0: shadowMapSystem?.cubeMaps[0]?.texture,
            shadowCube1: shadowMapSystem?.cubeMaps[1]?.texture,

            cameraVec: camera.position,
            settings: [
                maxTextures, mutableData.shadowMapResolution, mutableData.indirectLightAttenuation, pcfSamples,
                giGridSize ? giGridSize : 1, giFBO ? 0 : 1, pointLightsQuantity, 0,
                shadowMapSystem ? 0 : 1, mutableData.shadowMapsQuantity, ao ? 1 : 0, 0,
                0, 0, 0, 0
            ],
            directionalLightsData,
            dirLightPOV,
            pointLightData
        })
        deferredSystem.frameBuffer.draw()
    }

}