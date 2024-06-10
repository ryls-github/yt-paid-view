const data = $$("yt-activity-item-renderer").map(e => {
	const day = e.querySelector("#section-heading").textContent.trim()
	const channel = e.querySelector("#title").textContent.trim()
	const yen = e.querySelector("#activity-metadata").textContent.trim()
	return { day, channel, yen }
})

for (const [index, item] of data.entries()) {
	if (item.day) {
		// 読み取ったものは「4月30日」形式なので
		// 今の年をくっつけて 2024/04/30 形式にする
		const matched = item.day.match(/^(\d+)月(\d+)日$/)
		if (!matched) throw new Error("不正な日付です")
		const day = [
			new Date().getFullYear(),
			String(matched[1]).padStart(2, "0"),
			String(matched[2]).padStart(2, "0"),
		].join("/")
		item.day = day
	} else {
		// 連続して同じ日だと省略されるので一つ上をコピーする
		item.day = data[index - 1].day
	}
	// 読み取ったものは「￥1,000」形式なので
	// 数値形式にする
	item.yen = +item.yen.replace("￥", "").replace(",", "")
}

copy(data)
