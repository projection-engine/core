import System from "../basic/System";


import * as skyShader from '../shaders/misc/skybox.glsl'
import ShaderInstance from "../instances/ShaderInstance";
import {createVAO} from "../utils/utils";
import {mat4, vec3} from "gl-matrix";
import {VIEWS} from "./ShadowMapSystem";
import VBO from "../instances/VBO";
import cube from "../templates/CUBE.js";
import {intersectBoundingSphere} from "./PhysicsSystem";
import COMPONENTS from "../templates/COMPONENTS";
import ForwardSystem from "./ForwardSystem";

export const STEPS_CUBE_MAP = {
    BASE: 0,

    DONE: 3,
    CALCULATE: 4
}
export default class CubeMapSystem extends System {
    step = STEPS_CUBE_MAP.BASE
    lastCallLength = -1
    cubeMapsConsumeMap = {}

    constructor(gpu) {
        super([]);
        this.gpu = gpu
        this.skyShader = new ShaderInstance(skyShader.vertex, skyShader.fragment, gpu)
        this.vao = createVAO(gpu)
        this.vbo = new VBO(gpu, 0, new Float32Array(cube), gpu.ARRAY_BUFFER, 3, gpu.FLOAT)
        gpu.bindVertexArray(null)
    }


    execute(options, systems, data) {
        super.execute()
        const {
            cubeMaps,
            skybox,
            meshes
        } = data

        // RADIUS 10
        if (this.lastCallLength !== cubeMaps.length) {
            this.step = STEPS_CUBE_MAP.BASE
            this.lastCallLength = cubeMaps.length
        }
        if (this.step !== STEPS_CUBE_MAP.DONE && (skybox && skybox.cubeMap || !skybox)) {
            switch (this.step) {
                case STEPS_CUBE_MAP.BASE:
                    this._generateBaseTexture(options, systems, data)
                    for (let i = 0; i < cubeMaps.length; i++) {
                        const current = cubeMaps[i].components[COMPONENTS.CUBE_MAP]
                        current.cubeMap.generateIrradiance()
                    }
                    for (let i = 0; i < cubeMaps.length; i++) {
                        const current = cubeMaps[i].components[COMPONENTS.CUBE_MAP]
                        current.cubeMap.generatePrefiltered(current.prefilteredMipmaps, current.resolution)
                    }
                    this.step = STEPS_CUBE_MAP.CALCULATE
                    break

                case STEPS_CUBE_MAP.CALCULATE:

                    const changedMeshes = meshes
                    let newCubeMaps = {}

                    for (let i = 0; i < cubeMaps.length; i++) {
                        const current = cubeMaps[i].components[COMPONENTS.CUBE_MAP],
                            pos = cubeMaps[i].components[COMPONENTS.TRANSFORM].position,
                            radius = current.radius

                        for (let m = 0; m < changedMeshes.length; m++) {

                            const currentMesh = changedMeshes[m].components
                            if (intersectBoundingSphere(currentMesh[COMPONENTS.MATERIAL].radius, radius, currentMesh[COMPONENTS.TRANSFORM].position.slice(0, 3), pos))
                                newCubeMaps[changedMeshes[m].id] = cubeMaps[i].id
                        }
                    }
                    this.cubeMapsConsumeMap = newCubeMaps
                    this.step = STEPS_CUBE_MAP.DONE
                    break
                default:
                    this.step = STEPS_CUBE_MAP.DONE
                    break
            }
        }
    }

    _generateBaseTexture(options, systems, data) {
        const {cubeMaps} = data
        for (let i = 0; i < cubeMaps.length; i++) {
            const current = cubeMaps[i].components[COMPONENTS.CUBE_MAP]
            current.cubeMap.resolution = current.resolution
            current.cubeMap.draw((yaw, pitch, projection, index) => {
                    const target = vec3.add([], cubeMaps[i].components[COMPONENTS.TRANSFORM].position, VIEWS.target[index])
                    const view = mat4.lookAt([], cubeMaps[i].components[COMPONENTS.TRANSFORM].position, target, VIEWS.up[index])

                    this.shader.use()
                    this._loopMeshes({
                            view,
                            projection,
                            data,
                            options,
                            cubeMapPosition:cubeMaps[i].components[COMPONENTS.TRANSFORM].translation
                        })
                },
                undefined,
                10000,
                1
            )
        }
    }

    _loopMeshes({
            view,
            projection,
            cubeMapPosition,
            data,
            options
        }) {
        const {
            meshes, materials, meshSources, directionalLightsData,
            dirLightPOV, pointLightsQuantity, pointLightData,
            maxTextures
        } = data

        const {fallbackMaterial, brdf, elapsed} = options

        for (let m = 0; m < meshes.length; m++) {
            const current = meshes[m]
            const mesh = meshSources[current.components[COMPONENTS.MESH].meshID]
            if (mesh !== undefined) {
                const t = current.components[COMPONENTS.TRANSFORM]
                const currentMaterial = materials[current.components[COMPONENTS.MATERIAL].materialID]

                let mat = currentMaterial ? currentMaterial : fallbackMaterial
                if (!mat || !mat.ready)
                    mat = fallbackMaterial

                // TODO - Use simplified shader
                ForwardSystem.drawMesh({
                    mesh,
                    camPosition: cubeMapPosition,
                    viewMatrix: view,
                    projectionMatrix: projection,
                    transformMatrix: t.transformationMatrix,
                    material: mat,
                    normalMatrix: current.components[COMPONENTS.MESH].normalMatrix,
                    materialComponent: current.components[COMPONENTS.MATERIAL],
                    brdf,

                    directionalLightsQuantity: maxTextures,
                    directionalLightsData,
                    dirLightPOV,
                    pointLightsQuantity,
                    pointLightData,

                    elapsed,

                    lastMaterial: this.lastMaterial,
                    gpu: this.gpu
                })
                this.lastMaterial = mat?.id
            }
        }
    }
}