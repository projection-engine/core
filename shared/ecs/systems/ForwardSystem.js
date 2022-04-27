import System from "../basic/System";

import * as shaderCode from '../../shaders/mesh/forwardMesh.glsl'
import * as skyShader from '../../shaders/misc/skybox.glsl'
import Shader from "../../utils/workers/Shader";
import {createVAO} from "../../utils/misc/utils";
import VBO from "../../utils/workers/VBO";
import cube from "../../../utils/cube.json";
import COMPONENTS from "../../templates/COMPONENTS";
import SYSTEMS from "../../templates/SYSTEMS";

export default class ForwardSystem extends System {
    lastMaterial
    cubeMapsConsumeMap = {}

    constructor(gpu) {
        super([]);
        this.gpu = gpu
        this.shader = new Shader(shaderCode.vertex, shaderCode.fragment, gpu)
        this.skyShader = new Shader(skyShader.vertex, skyShader.fragment, gpu)

        this.vao = createVAO(gpu)
        this.vbo = new VBO(gpu, 0, new Float32Array(cube), gpu.ARRAY_BUFFER, 3, gpu.FLOAT)
        gpu.bindVertexArray(null)
    }


    execute(options, systems, data, sceneColor) {
        super.execute()
        const {
            meshes,
            skybox,
            materials,
            meshSources,
            cubeMapsSources,
            pointLightsQuantity,
            maxTextures,
            dirLights,
            dirLightsPov,
            lClip,
            lPosition,
            lColor,
            lAttenuation,
        } = data

        const {
            elapsed,
            camera,
            fallbackMaterial,
            brdf
        } = options
        const toConsumeCubeMaps = systems[SYSTEMS.CUBE_MAP]?.cubeMapsConsumeMap
        this.lastMaterial = undefined



        for (let m = 0; m < meshes.length; m++) {
            const current = meshes[m]
            const mesh = meshSources[current.components[COMPONENTS.MESH].meshID]
            if (mesh !== undefined) {
                const t = current.components[COMPONENTS.TRANSFORM]
                const currentMaterial = materials[current.components[COMPONENTS.MATERIAL].materialID]

                let mat = currentMaterial && currentMaterial.ready ? currentMaterial : fallbackMaterial
                if (!mat || !mat.ready)
                    mat = fallbackMaterial
                const c = toConsumeCubeMaps ? toConsumeCubeMaps[current.id] : undefined
                let cubeMapToApply, ambient = {}

                if (c)
                    cubeMapToApply = cubeMapsSources[c]
                if (cubeMapToApply) {
                    const cube = cubeMapToApply.components[COMPONENTS.CUBE_MAP]
                    ambient.irradianceMap = cube.irradiance ? cube.irradianceMap : skybox?.cubeMap.irradianceTexture
                    ambient.prefilteredMap = cube.prefilteredMap
                    ambient.prefilteredLod = cube.prefilteredMipmaps
                } else if (skybox && skybox.cubeMap !== undefined) {
                    ambient.irradianceMap = skybox?.cubeMap.irradianceTexture
                    ambient.prefilteredMap = skybox?.cubeMap.prefiltered
                    ambient.prefilteredLod = 6
                }



                this.drawMesh(
                    mesh,
                    camera.position,
                    camera.viewMatrix,
                    camera.projectionMatrix,
                    t.transformationMatrix,
                    mat,
                    current.components[COMPONENTS.MESH].normalMatrix,
                    current.components[COMPONENTS.MATERIAL],
                    brdf,

                    pointLightsQuantity,
                    maxTextures,
                    dirLights,
                    dirLightsPov,
                    lClip,
                    lPosition,
                    lColor,
                    lAttenuation,



                    elapsed,
                    ambient.irradianceMap,
                    ambient.prefilteredMap,
                    ambient.prefilteredLod,
                    sceneColor
                )
            }
        }
    }

    drawMesh(
        mesh,
        camPosition,
        viewMatrix,
        projectionMatrix,
        transformMatrix,
        material,
        normalMatrix,
        materialComponent,
        brdf,
        pointLightsQuantity,
        maxTextures,
        dirLights,
        dirLightsPov,
        lClip,
        lPosition,
        lColor,
        lAttenuation,

        elapsed,
        closestIrradiance,
        closestPrefiltered,
        prefilteredLod,
        sceneColor
    ) {

        if (material && material.settings?.isForwardShaded) {

            const gpu = this.gpu
            mesh.use()

            material.use(this.lastMaterial !== material.id, {
                projectionMatrix,
                transformMatrix,
                viewMatrix,

                normalMatrix,
                sceneColor,
                brdfSampler: brdf,
                elapsedTime: elapsed,
                cameraVec: camPosition,
                irradianceMap: closestIrradiance,
                prefilteredMapSampler: closestPrefiltered,
                ambientLODSamples: prefilteredLod,

                dirLightQuantity: maxTextures,
                directionalLights: dirLights,
                directionalLightsPOV: dirLightsPov,

                lightQuantity: pointLightsQuantity,
                lightClippingPlane: lClip,
                lightPosition: lPosition,
                lightColor: lColor,
                lightAttenuationFactors: lAttenuation,
                ...(materialComponent.overrideMaterial ? materialComponent.uniformValues : {})
            })


            this.lastMaterial = material.id
            if (material.doubleSided)
                gpu.disable(gpu.CULL_FACE)
            gpu.drawElements(gpu.TRIANGLES, mesh.verticesQuantity, gpu.UNSIGNED_INT, 0)
            if (material.doubleSided)
                gpu.enable(gpu.CULL_FACE)
            mesh.finish()
        }
    }
}