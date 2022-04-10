import {createVAO, createVBO} from "../utils/misc/utils";
import VBO from "../utils/workers/VBO";
import {v4 as uuidv4} from 'uuid';

export default class MeshInstance {
    verticesQuantity = 0
    trianglesQuantity = 0


    maxBoundingBox = []
    minBoundingBox = []
    VAO
    vertexVBO
    indexVBO
    normalVBO
    uvVBO
    tangentVBO

    constructor({
                    id = uuidv4(),
                    gpu,

                    vertices,
                    indices,
                    normals,
                    uvs,
                    tangents,

                    maxBoundingBox,
                    minBoundingBox,
                    wireframeBuffer,
                    material
                }) {


        this.id = id
        this.gpu = gpu
        this.material = material
        this.maxBoundingBox = maxBoundingBox
        this.minBoundingBox = minBoundingBox

        this.trianglesQuantity = indices.length / 3
        this.verticesQuantity = indices.length

        this.VAO = createVAO(gpu)


        this.indexVBO = createVBO(gpu, gpu.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices))

        this.vertexVBO = new VBO(gpu, 1, new Float32Array(vertices), gpu.ARRAY_BUFFER, 3, gpu.FLOAT)
        if (normals && normals.length > 0)
            this.normalVBO = new VBO(gpu, 2, new Float32Array(normals), gpu.ARRAY_BUFFER, 3, gpu.FLOAT)
        if (uvs && uvs.length > 0)
            this.uvVBO = new VBO(gpu, 3, new Float32Array(uvs), gpu.ARRAY_BUFFER, 2, gpu.FLOAT)
        if (tangents && tangents.length > 0)
            this.tangentVBO = new VBO(gpu, 4, new Float32Array(tangents), gpu.ARRAY_BUFFER, 3, gpu.FLOAT)

        gpu.bindVertexArray(null)
        gpu.bindBuffer(gpu.ELEMENT_ARRAY_BUFFER, null)

    }

    use() {
        this.gpu.bindVertexArray(this.VAO)
        this.gpu.bindBuffer(this.gpu.ELEMENT_ARRAY_BUFFER, this.indexVBO)

        this.vertexVBO.enable()
        if (this.normalVBO)
            this.normalVBO.enable()
        if (this.uvVBO)
            this.uvVBO.enable()
        if (this.tangentVBO)
            this.tangentVBO.enable()
    }

    finish() {

        this.gpu.bindVertexArray(null)
        this.gpu.bindBuffer(this.gpu.ELEMENT_ARRAY_BUFFER, null)
        this.vertexVBO.disable()

        if (this.uvVBO)
            this.uvVBO.disable()
        if (this.normalVBO)
            this.normalVBO.disable()
        if (this.tangentVBO)
            this.tangentVBO.disable()
    }
}
