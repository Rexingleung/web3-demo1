// 字符串转十六进制
export function stringToHex({ input='', addPrefix=true, addSpacing=false, upperCase=false }: { input: string; addPrefix?: boolean; addSpacing?: boolean; upperCase?: boolean }) {
	let errMsg = "";
	if (!input) {
		throw new Error("请输入要转换的字符串");
	}

	try {
		const hexArray: string[] = [];

		// 将字符串转换为UTF-8字节序列
		const encoder = new TextEncoder();
		const bytes = encoder.encode(input);

		// 将每个字节转换为十六进制
		for (let byte of bytes) {
			let hex = byte.toString(16);

			// 确保是两位数
			if (hex.length === 1) {
				hex = "0" + hex;
			}

			// 处理大小写
			if (upperCase) {
				hex = hex.toUpperCase();
			}

			hexArray.push(hex);
		}

		// 连接结果
		const separator = addSpacing ? " " : "";
		let result = hexArray.join(separator);

		// 添加前缀到整个结果前面
		if (addPrefix) {
			result = "0x" + result;
		}

		return result;
	} catch (error: any) {
		console.log(error);
		errMsg = "转换失败：" + error.message;
		throw new Error(errMsg);
	}
}

// 十六进制转字符串
export function hexToString({ input='' }: { input: string }) {
	if (!input) {
		throw new Error('请输入十六进制数据')
	}
	
	try {
		// 清理输入：移除0x前缀和多余空格
		input = input.replace(/0x/gi, '');
		input = input.replace(/\s+/g, ' ');
		
		// 分割十六进制字符串
		const hexParts = input.split(' ');
		
		// 确保每个部分都是有效的十六进制
		for (let i = 0; i < hexParts.length; i++) {
			let part = hexParts[i];
			if (part.length === 1) {
				hexParts[i] = "0" + part;
			}
		}
		
		// 重新组合
		const cleanHex = hexParts.join('');
		
		// 验证十六进制格式
		if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
			throw new Error('无效的十六进制格式');
		}
		
		// 确保是偶数长度
		if (cleanHex.length % 2 !== 0) {
			throw new Error('十六进制字符串长度必须是偶数');
		}
		
		// 转换为字节数组
		const bytes: number[] = [];
		for (let i = 0; i < cleanHex.length; i += 2) {
			const hexByte = cleanHex.substr(i, 2);
			bytes.push(parseInt(hexByte, 16));
		}
		
		// 使用TextDecoder解码UTF-8
		const decoder = new TextDecoder('utf-8');
		const uint8Array = new Uint8Array(bytes);
		const result = decoder.decode(uint8Array);
		
		return result;
			
	} catch (error: any) {
		throw new Error('转换失败：' + error.message);
	}
}

