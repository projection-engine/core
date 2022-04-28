import System from "../../ecs/basic/System";
import Shader from "../../utils/Shader";
import * as gizmoShaderCode from "../../shaders/misc/gizmo.glsl";

import {mat4, quat, vec3} from "gl-matrix";
import Entity from "../../ecs/basic/Entity";
import TransformComponent from "../../ecs/components/TransformComponent";
import MeshInstance from "../../instances/MeshInstance";
import Transformation from "../../utils/Transformation";
import PickComponent from "../../ecs/components/PickComponent";
import TextureInstance from "../../instances/TextureInstance";
import circle from "../icons/circle.png";
import plane from "../assets/Circle.json";
import ROTATION_TYPES from "./ROTATION_TYPES";
import COMPONENTS from "../../templates/COMPONENTS";

const toDeg = 57.29, toRad = 3.1415 / 180
export default class RotationGizmo extends System {

    clickedAxis = -1
    tracking = false
    currentRotation = [0, 0, 0]
    gridSize = .01
    distanceX = 0
    distanceY = 0
    distanceZ = 0

    constructor(gpu, renderTarget) {
        super([]);
        this.renderTarget = renderTarget
        this.gpu = gpu

        this.gizmoShader = new Shader(gizmoShaderCode.vertexRot, gizmoShaderCode.fragmentRot, gpu)
        this.xGizmo = this._mapEntity(2, 'x')
        this.yGizmo = this._mapEntity(3, 'y')
        this.zGizmo = this._mapEntity(4, 'z')


        this.xyz = new MeshInstance({
            gpu,
            vertices: plane.vertices,
            indices: plane.indices,
            normals: [],
            uvs: plane.uvs,
            tangents: [],
        })
        this.texture = new TextureInstance(circle, false, this.gpu)
        this.handlerListener = this.handler.bind(this)
        this.gpu.canvas.addEventListener('mouseup', this.handlerListener)
        this.gpu.canvas.addEventListener('mousedown', this.handlerListener)
    }

    _mapEntity(i, axis) {
        const e = new Entity(undefined)
        e.components[COMPONENTS.PICK] = new PickComponent(undefined, i - 3)
        e.components[COMPONENTS.TRANSFORM] = new TransformComponent()
        let s, t = [0, 0, 0], r
        switch (axis) {
            case 'x':
                s = [1, .1, 1]
                r = [0, 0, 1.57]
                break
            case 'y':
                s = [1, .1, 1]
                r = [0, 0, 0]
                break
            case 'z':
                s = [1, .1, 1]
                r = [1.57, 0, 0]
                break

            default:
                break
        }
        e.components[COMPONENTS.TRANSFORM].translation = t
        e.components[COMPONENTS.TRANSFORM].rotation = r
        e.components[COMPONENTS.TRANSFORM].transformationMatrix = Transformation.transform(t, r, s)

        return e
    }

    handler(event) {
        switch (event.type) {
            case 'mousedown':
                if (document.elementsFromPoint(event.clientX, event.clientY).includes(this.gpu.canvas) && !this.firstPick) {
                    const target = this.gpu.canvas.getBoundingClientRect()
                    this.currentCoord = {x: event.clientX - target.left, y: event.clientY - target.top}
                }
                if (this.firstPick)
                    this.firstPick = false

                break
            case 'mouseup':
                this.firstPick = true
                if (this.tracking) {
                    this.renderTarget.innerText = ''
                    this.onGizmoEnd()
                    this.started = false
                    this.distanceX = 0
                    this.distanceY = 0
                    this.distanceZ = 0
                    this.tracking = false
                    this.clickedAxis = -1
                    this.currentCoord = undefined
                    this.gpu.canvas.removeEventListener("mousemove", this.handlerListener)
                    document.exitPointerLock()
                    this.renderTarget.style.display = 'none'

                    this.currentRotation = [0, 0, 0]

                    this.t = 0
                }
                break
            case 'mousemove':
                if (!this.started) {
                    this.started = true
                    this.onGizmoStart()
                }

                switch (this.clickedAxis) {
                    case 1: // x
                        this.distanceX += Math.abs(event.movementX * 0.05)
                        if (Math.abs(this.distanceX) >= this.gridSize) {
                            this.rotateElement([Math.sign(event.movementX) * this.gridSize * toRad, 0, 0])
                            this.distanceX = 0
                            this.renderTarget.innerText = `${(this.currentRotation[0] * toDeg).toFixed(1)} θ`
                        }
                        break
                    case 2: // y
                        this.distanceY += Math.abs(event.movementX * 0.05)
                        if (Math.abs(this.distanceY) >= this.gridSize) {
                            this.rotateElement([0, Math.sign(event.movementX) * this.gridSize * toRad, 0])
                            this.renderTarget.innerText = `${(this.currentRotation[1] * toDeg).toFixed(1)} θ`
                            this.distanceY = 0
                        }
                        break
                    case 3: // z
                        this.distanceZ += Math.abs(event.movementX * 0.05)
                        if (Math.abs(this.distanceZ) >= this.gridSize) {
                            this.rotateElement([0, 0, Math.sign(event.movementX) * this.gridSize * toRad])

                            this.distanceZ = 0
                            this.renderTarget.innerText = `${(this.currentRotation[2] * toDeg).toFixed(1)} θ`
                        }
                        break
                }

                break
            default:
                break
        }
    }

    rotateElement(vec) {
        let quatA = [0, 0, 0, 1]
        vec3.add(this.currentRotation, this.currentRotation, vec)
        if (vec[0] !== 0)
            quat.rotateX(quatA, quatA, vec[0])
        if (vec[1] !== 0)
            quat.rotateY(quatA, quatA, vec[1])
        if (vec[2] !== 0)
            quat.rotateZ(quatA, quatA, vec[2])

        for (let i = 0; i < this.target.length; i++) {
            const target = this.target[i].components[COMPONENTS.TRANSFORM]
            if (this.typeRot === ROTATION_TYPES.GLOBAL || this.target.length > 1)
                target.rotationQuat = quat.multiply([], quatA, target.rotationQuat)
            else
                target.rotationQuat = quat.multiply([], target.rotationQuat, quatA)
        }
    }

    getTranslation(el) {
        const k = Object.keys(el.components)
        let key
        for (let i = 0; i < k.length; i++) {
            switch (k[i]) {
                case COMPONENTS.SKYLIGHT:
                case COMPONENTS.DIRECTIONAL_LIGHT:
                    key = k[i] === COMPONENTS.SKYLIGHT ? 'SkylightComponent' : 'DirectionalLightComponent'
                    return el.components[key].direction
                case COMPONENTS.TRANSFORM:

                    return el.components[COMPONENTS.TRANSFORM]?.translation
                default:
                    break
            }
        }
        return [0,0,0]
    }

    execute(
        meshes,
        meshSources,
        selected,
        camera,
        pickSystem,
        lockCamera,
        entities,
        transformationType,
        onGizmoStart,
        onGizmoEnd,
        gridSize
    ) {
        super.execute()

        if (selected.length > 0) {
            const el = entities[selected[0]]
            if (el && el.components[COMPONENTS.TRANSFORM]) {
                const parent = el ? entities[el.linkedTo] : undefined
                const currentTranslation = this.getTranslation(el),
                    parentTranslation = parent ? this.getTranslation(parent) : [0, 0, 0],
                    translation = currentTranslation ? [
                        currentTranslation[0] + parentTranslation[0],
                        currentTranslation[1] + parentTranslation[1],
                        currentTranslation[2] + parentTranslation[2]
                    ] : undefined
                if (translation) {
                    this.gridSize = gridSize
                    this.firstPick = false
                    this.typeRot = transformationType
                    this.camera = camera
                    this.onGizmoStart = onGizmoStart
                    this.onGizmoEnd = onGizmoEnd
                    if (this.currentCoord && !this.tracking) {
                        const pickID = pickSystem.pickElement((shader, proj) => {
                            this._drawGizmo(translation, el.components[COMPONENTS.TRANSFORM].rotationQuat, camera.viewMatrix, proj, shader)
                        }, this.currentCoord, camera, true)
                        this.clickedAxis = pickID - 2
                        if (pickID === 0) {
                            lockCamera(false)
                            this.currentCoord = undefined
                        } else {
                            this.tracking = true
                            lockCamera(true)

                            this.renderTarget.style.left = this.currentCoord.x + 'px'
                            this.renderTarget.style.top = this.currentCoord.y + 'px'
                            this.renderTarget.style.display = 'block'
                            this.renderTarget.style.width = 'fit-content'

                            this.target = selected.map(e => entities[e])

                            this.gpu.canvas.requestPointerLock()
                            this.gpu.canvas.addEventListener("mousemove", this.handlerListener)
                        }
                    }

                    this._drawGizmo(translation, el.components[COMPONENTS.TRANSFORM].rotationQuat, camera.viewMatrix, camera.projectionMatrix, this.gizmoShader)
                }
            }
        }

    }

    _rotateMatrix(t, rotation, axis, m, comp) {
        let matrix

        if (this.typeRot === ROTATION_TYPES.GLOBAL && axis !== undefined) {
            matrix = [...m]
            matrix[12] += t[0]
            matrix[13] += t[1]
            matrix[14] += t[2]
            switch (axis) {
                case 'x':
                    mat4.rotateY(matrix, matrix, -this.currentRotation[0])
                    break
                case 'y':
                    mat4.rotateY(matrix, matrix, this.currentRotation[1])
                    break
                case 'z':
                    mat4.rotateY(matrix, matrix, this.currentRotation[2])
                    break
                default:
                    break
            }
        } else if (axis !== undefined)
            matrix = mat4.fromRotationTranslationScale([], quat.multiply([], rotation, comp.rotationQuat), t, comp.scaling)
        else {
            matrix = [...m]
            matrix[12] += t[0]
            matrix[13] += t[1]
            matrix[14] += t[2]
        }
        return matrix
    }

    _drawGizmo(translation, rotation, view, proj, shader) {
        this.gpu.clear(this.gpu.DEPTH_BUFFER_BIT)
        this.gpu.disable(this.gpu.CULL_FACE)

        const mX = this._rotateMatrix(translation, rotation, 'x', this.xGizmo.components[COMPONENTS.TRANSFORM].transformationMatrix, this.xGizmo.components[COMPONENTS.TRANSFORM])
        const mY = this._rotateMatrix(translation, rotation, 'y', this.yGizmo.components[COMPONENTS.TRANSFORM].transformationMatrix, this.yGizmo.components[COMPONENTS.TRANSFORM])
        const mZ = this._rotateMatrix(translation, rotation, 'z', this.zGizmo.components[COMPONENTS.TRANSFORM].transformationMatrix, this.zGizmo.components[COMPONENTS.TRANSFORM])

        shader.use()
        this.gpu.bindVertexArray(this.xyz.VAO)
        this.gpu.bindBuffer(this.gpu.ELEMENT_ARRAY_BUFFER, this.xyz.indexVBO)
        this.xyz.vertexVBO.enable()
        this.xyz.uvVBO.enable()

        if (this.tracking && this.clickedAxis === 1 || !this.tracking)
            this._draw(view, mX, proj, 1, this.xGizmo.components[COMPONENTS.PICK].pickID, shader, translation)
        if (this.tracking && this.clickedAxis === 2 || !this.tracking)
            this._draw(view, mY, proj, 2, this.yGizmo.components[COMPONENTS.PICK].pickID, shader, translation)
        if (this.tracking && this.clickedAxis === 3 || !this.tracking)
            this._draw(view, mZ, proj, 3, this.zGizmo.components[COMPONENTS.PICK].pickID, shader, translation)

        this.xyz.vertexVBO.disable()
        this.gpu.bindVertexArray(null)
        this.gpu.bindBuffer(this.gpu.ELEMENT_ARRAY_BUFFER, null)
        this.gpu.enable(this.gpu.CULL_FACE)

    }

    _draw(view, t, proj, a, id, shader, tt) {


        shader.bindForUse({
            viewMatrix: view,
            transformMatrix: t,
            projectionMatrix: proj,
            axis: a,
            translation: tt,
            camPos: this.camera.position,
            selectedAxis: this.clickedAxis,
            uID: [...id, 1],
            circleSampler: this.texture.texture
        })
        this.gpu.drawElements(this.gpu.TRIANGLES, this.xyz.verticesQuantity, this.gpu.UNSIGNED_INT, 0)


    }
}
