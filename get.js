const data = $$("yt-activity-item-renderer").map(e => {
	const day = e.querySelector("#section-heading").textContent.trim()
	const channel = e.querySelector("#title").textContent.trim()
	const yen = e.querySelector("#activity-metadata").textContent.trim()
	return { day, channel, yen }
})

const parseDate = (str) => {
	// 同じ年なら「1月2日」形式
	// 過去の年なら「2024/01/02」形式
	{
		const matched = str.match(/^(\d+)月(\d+)日$/)
		if (matched) {
			return [
				new Date().getFullYear(),
				String(matched[1]).padStart(2, "0"),
				String(matched[2]).padStart(2, "0"),
			].join("/")
		}
	}
	{
		const matched = str.match(/^\d{4}\/\d{2}\/\d{2}$/)
		if (matched) {
			return str
		}
	}
	throw new Error("不正な日付です")
}

for (const [index, item] of data.entries()) {
	if (item.day) {
		item.day = parseDate(item.day)
	} else {
		// 連続して同じ日だと省略されるので一つ上をコピーする
		item.day = data[index - 1].day
	}
	// 読み取ったものは「￥1,000」形式なので
	// 数値形式にする
	item.yen = +item.yen.replace("￥", "").replace(",", "")
}

copy(data)
