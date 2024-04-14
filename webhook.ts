const throwOn4xx = async (res) => {
	if (res.status >= 400 && res.status < 500) {
		console.error(res)
		console.error(await res.text())
		console.error((new Error()).stack)
		throw new Error(res.status)
	}
	return res
}
let ratelimitBucketReset = null
const notFoundURLs = []
const requestQueue = []
let processingRequest = false
export const mfetch = async (...body) => {
	if (notFoundURLs.includes(body[0])) {
		throw new Error("404")
	}
	if (ratelimitBucketReset && ratelimitBucketReset > Date.now() / 1000) {
		await new Promise(resolve => setTimeout(resolve, (ratelimitBucketReset - Date.now() / 1000) * 1000))
		if (processingRequest) {
			let resolve = null
			const promise = new Promise(res => resolve = res)
			requestQueue.push(resolve)
			await promise
		}
		return await mfetch(...body)
	}
	processingRequest = true
	const response = await fetch(...body);
	console.log(response.headers.get("X-RateLimit-Remaining"))
	if (response.headers.get("X-RateLimit-Remaining") === "0") {
		ratelimitBucketReset = +response.headers.get("X-RateLimit-Reset")
	}
	if (response.status === 429) {
		try {
			const data = await response.clone().json()
			if (data.retry_after) {
				await new Promise(resolve => setTimeout(resolve, data.retry_after * 1000))
				return await mfetch(...body)
			}
		} catch (e) {}
		console.log()
	}
	if (response.status === 404) notFoundURLs.push(body[0])
	processingRequest = false
	if (requestQueue.length > 0) requestQueue.shift()()
	return await throwOn4xx(response)
}
export const send_file = async (blob, name) => {
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify({}));
  formData.append('file', blob, name);
  const response = await mfetch(process.env.webhook + "?wait=true", {
	  method: 'POST',
	  body: formData,
  });
  return await response.json();
}
export const edit_msg = async (id, blob, name) => {
  const formData = new FormData();
  formData.append('payload_json', JSON.stringify({
	"attachments": []
  }));
  formData.append('file', blob, name);
  const response = await mfetch(process.env.webhook + "/messages/" + id, {
	  method: 'PATCH',
	  body: formData,
  });
  return await response.json();
}