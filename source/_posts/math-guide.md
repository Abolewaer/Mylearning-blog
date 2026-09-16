---
title: 深度学习笔记的公式书写指南
date: 2026-09-16 10:00:00
categories:
  - 工具与方法
tags:
  - LaTeX
  - 深度学习
---

从一个损失函数，到一页完整推导。这里记录博客支持的公式写法，也是一份可以直接复制的速查表。

<!-- more -->

## 行内公式

用一对美元符号包住公式：`$\mathcal{L}(\theta)$`，效果是 $\mathcal{L}(\theta)$。
下标、上标和希腊字母也可以直接使用：$x_i$、$W^{\top}$、$\alpha$、$\theta$。

## Attention

独立公式用两行 `$$` 包住。公式会居中显示；较长公式在小屏幕上可以横向滚动。

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V
\tag{1}
$$

```latex
$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)V
\tag{1}
$$
```

## 损失函数与梯度

$$
\begin{aligned}
\mathcal{L}(\theta) &= -\frac{1}{N}\sum_{i=1}^{N}\log p_{\theta}(y_i\mid x_i) \\
\theta_{t+1} &= \theta_t-\eta\nabla_{\theta}\mathcal{L}(\theta_t)
\end{aligned}
$$

用 `aligned` 对齐多行推导，用 `&` 标记对齐位置，用 `\\` 换行。

## 矩阵与分段函数

$$
W=\begin{bmatrix}w_{11}&w_{12}\\w_{21}&w_{22}\end{bmatrix}
\qquad
\operatorname{ReLU}(x)=\begin{cases}x & x>0\\0 & x\leq0\end{cases}
$$

```latex
W=\begin{bmatrix}w_{11}&w_{12}\\w_{21}&w_{22}\end{bmatrix}
\operatorname{ReLU}(x)=\begin{cases}x & x>0\\0 & x\leq0\end{cases}
```

## 在网页编辑器里写

- 独立公式：正文工具栏的 **+ → LaTeX 公式**，输入公式内容即可，不需要自己填写 `$$`。
- 行内公式：切到 **Markdown / 源码**模式，使用 `$...$`；右侧预览会显示公式。
- 多行推导建议使用公式组件或源码模式，避免富文本格式操作改变反斜杠。
- `\tag{1}` 可以手动编号。当前不提供跨公式的自动编号和 `\ref` 引用。
- 这里使用 KaTeX 支持的数学命令，不是完整的 LaTeX 文档编译器；不支持的命令会在预览中标红。

公式字体随博客一起托管，读者无需安装 LaTeX。
