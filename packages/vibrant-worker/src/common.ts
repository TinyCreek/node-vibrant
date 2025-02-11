export interface WorkerRequest {
  id: number
  payload: any[]
  transferList?: any[]
}

export interface WorkerResponse<R> {
  id: number
  type: 'return'
  payload: R
}

export interface WorkerErrorResponse {
  id: number
  type: 'error'
  payload: string
}
