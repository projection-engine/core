import System from "../basic/System"

import SYSTEMS from "../templates/SYSTEMS"
import * as smShaders from "../shaders/shadows/SHADOW_MAP.glsl"
import ShaderInstance from "../instances/ShaderInstance"
import FramebufferInstance from "../instances/FramebufferInstance"
import CubeMapInstance from "../instances/CubeMapInstance"
import {mat4, vec3} from "gl-matrix"
import COMPONENTS from "../templates/COMPONENTS"

export const VIEWS = {
    target: [
        [1., 0., 0.],
        [-1., 0., 0.],
        [0., 1., 0.],
        [0., -1., 0.],
        [0., 0., 1.],
        [0., 0., -1.],
    ],
    up: [
        [0., -1., 0.],
        [0., -1., 0.],
        [0., 0., 1.],
        [0., 0., -1.],
        [0., -1., 0.],
        [0., -1., 0.],
    ]
}


export default class ShadowMapSystem extends System {
    changed = false

    constructor() {
        super()
        this.maxCubeMaps = 2
        this.cubeMaps = [
            new CubeMapInstance( 512, true),
            new CubeMapInstance(512, true)
        ]
        this.resolutionPerTexture = 1024
        this.maxResolution = 4096
        this.updateFBOResolution()
        this.shadowMapShader = new ShaderInstance(smShaders.vertex, smShaders.fragment)
        this.shadowMapOmniShader = new ShaderInstance(smShaders.vertex, smShaders.omniFragment)
    }

    updateFBOResolution() {
        super.updateFBOResolution()

        if(this.shadowsFrameBuffer){
            window.gpu.deleteTexture(this.shadowsFrameBuffer.depthSampler)
            window.gpu.deleteFramebuffer(this.shadowsFrameBuffer.FBO)
        }

        this.shadowsFrameBuffer = new FramebufferInstance(this.maxResolution, this.maxResolution)
        this.shadowsFrameBuffer
            .depthTexture()
    }



    #prepareBuffer(
        shadowAtlasQuantity,
        shadowMapResolution
    ) {
        if (this.maxResolution !== shadowMapResolution && shadowMapResolution) {
            this.maxResolution = shadowMapResolution
            this.updateFBOResolution()
            this.changed = true
        }
        if (this.maxResolution / shadowAtlasQuantity !== this.resolutionPerTexture && shadowAtlasQuantity) {
            this.resolutionPerTexture = this.maxResolution / shadowAtlasQuantity
            this.changed = true
        }

    }

    execute(options, systems, data) {
        super.execute()
        const gpu = window.gpu
        const {
            pointLights,
            meshes,
            directionalLights,
            materials,
            meshSources
        } = data
        const {
            shadowAtlasQuantity,
            shadowMapResolution
        } = options

        this.#prepareBuffer(
            shadowAtlasQuantity,
            shadowMapResolution
        )


        let lights2D = [], lights3D = [], transformChanged = systems[SYSTEMS.TRANSFORMATION]?.changed
        const dirL = directionalLights.length
        for (let i = 0; i < dirL; i++) {
            const current = directionalLights[i].components[COMPONENTS.DIRECTIONAL_LIGHT]
            if ((current.changed || transformChanged) && current.shadowMap || this.changed) {
                lights2D.push(current)
                current.changed = false
                this.changed = true
            }
        }
        const pL = pointLights.length
        for (let i = 0; i < pL; i++) {
            const current = pointLights[i].components[COMPONENTS.POINT_LIGHT]

            if ((current.changed || transformChanged) && current.shadowMap) {
                lights3D.push({...current, translation: pointLights[i].components[COMPONENTS.TRANSFORM].position})
                current.changed = false
                this.changed = true
            }
        }


        if (this.changed) {
            this.changed = false
            gpu.cullFace(gpu.FRONT)
            this.shadowMapShader.use()
            const meshSystem = systems[SYSTEMS.MESH]
            let currentColumn = 0, currentRow = 0
            gpu.clearDepth(1)
            if (lights2D.length > 0) {
                this.shadowsFrameBuffer.startMapping()
                gpu.enable(gpu.SCISSOR_TEST)
                for (let face = 0; face < (this.maxResolution / this.resolutionPerTexture) ** 2; face++) {
                    if (face < lights2D.length) {
                        gpu.viewport(
                            currentColumn * this.resolutionPerTexture,
                            currentRow * this.resolutionPerTexture,
                            this.resolutionPerTexture,
                            this.resolutionPerTexture
                        )
                        gpu.scissor(
                            currentColumn * this.resolutionPerTexture,
                            currentRow * this.resolutionPerTexture,
                            this.resolutionPerTexture,
                            this.resolutionPerTexture
                        )

                        gpu.clear(gpu.DEPTH_BUFFER_BIT)

                        let currentLight = lights2D[face]
                        currentLight.atlasFace = [currentColumn, 0]

                        ShadowMapSystem.loopMeshes(meshes, meshSources, meshSystem, materials, this.shadowMapShader, currentLight.lightView, currentLight.lightProjection, currentLight.fixedColor)
                    }
                    if (currentColumn > this.maxResolution / this.resolutionPerTexture) {
                        currentColumn = 0
                        currentRow += 1
                    } else
                        currentColumn += 1
                }
                gpu.disable(gpu.SCISSOR_TEST)
                this.shadowsFrameBuffer.stopMapping()

            }

            if (lights3D.length > 0) {
                this.shadowMapOmniShader.use()
                gpu.viewport(0, 0, 512, 512)
                for (let i = 0; i < this.maxCubeMaps; i++) {
                    const current = lights3D[i]
                    if (current)
                        this.cubeMaps[i]
                            .draw((yaw, pitch, perspective, index) => {
                                const target = vec3.add([], current.translation, VIEWS.target[index])
                                ShadowMapSystem.loopMeshes(
                                    meshes,
                                    meshSources,
                                    meshSystem,
                                    materials,
                                    this.shadowMapOmniShader,
                                    mat4.lookAt([], current.translation, target, VIEWS.up[index]),
                                    perspective,
                                    undefined,
                                    current.translation,
                                    [current.zNear, current.zFar])
                            },
                            false,
                            current.zFar,
                            current.zNear)
                }
            }
            gpu.cullFace(gpu.BACK)
        }

    }

    static loopMeshes(meshes, meshSources, meshSystem, materials, shader, view, projection, color, lightPosition, shadowClipNearFar) {
        const l = meshes.length
        for (let m = 0; m < l; m++) {
            const current = meshes[m]
            const mesh = meshSources[current.components[COMPONENTS.MESH].meshID]
            if (mesh !== undefined) {
                const currentMaterialID = current.components[COMPONENTS.MATERIAL].materialID
                let mat = materials[currentMaterialID] ? materials[currentMaterialID] : undefined
                if (!mat || !mat.ready)
                    mat = meshSystem.fallbackMaterial
                const t = current.components[COMPONENTS.TRANSFORM]

                ShadowMapSystem.drawMesh(mesh, view, projection, t.transformationMatrix, mat, color, shader, lightPosition, shadowClipNearFar)
            }
        }
    }

    static drawMesh(mesh, viewMatrix, projectionMatrix, transformMatrix, mat, lightColor, shader, lightPosition, shadowClipNearFar) {
        const gpu = window.gpu
        gpu.bindVertexArray(mesh.VAO)
        gpu.bindBuffer(gpu.ELEMENT_ARRAY_BUFFER, mesh.indexVBO)
        mesh.vertexVBO.enable()
        shader.bindForUse({
            shadowClipNearFar,
            viewMatrix,
            transformMatrix,
            projectionMatrix,
            lightColor,
            albedoSampler: mat?.rsmAlbedo,

            lightPosition
        })


        gpu.drawElements(gpu.TRIANGLES, mesh.verticesQuantity, gpu.UNSIGNED_INT, 0)
        gpu.bindVertexArray(null)
        gpu.bindBuffer(gpu.ELEMENT_ARRAY_BUFFER, null)
        mesh.vertexVBO.disable()
        mesh.normalVBO.disable()
        mesh.uvVBO.disable()

    }
}