
export default class BenchmarkAPI{
    static contexts = new Map()
    static lastTimestamp = 0
    static onUpdate = () => null
    static onReset = () => null

    static registerTrack(label, samples=1000){
        BenchmarkAPI.contexts.set(label, [0, new Float32Array(samples), -1, samples])
    }

    static track(label){
        let context = BenchmarkAPI.contexts.get(label)
        if(!context) {
            BenchmarkAPI.registerTrack(label)
            context = BenchmarkAPI.contexts.get(label)
        }
        context[2] = performance.now()
    }

    static endTrack(label){
        const context = BenchmarkAPI.contexts.get(label)
        const ARR = context[1]
        const currentElapsed = performance.now() - context[2]

        ARR[context[0]] = currentElapsed
        context[0] += 1
        BenchmarkAPI.onUpdate(label, currentElapsed)
        if(context[3] <= context[0]) {
            console.log(label, ARR)
            BenchmarkAPI.onReset(label, Array.from(ARR))
            context[0] = 0
        }
    }
}