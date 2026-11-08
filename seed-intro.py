import sqlite3,pathlib,datetime
d=sqlite3.connect('/var/lib/youtuo/content.sqlite')
title='走进优驼：扎根新疆，专注骆驼产业'
body='''## 企业概况
优驼成立于2017年8月，总部位于新疆阿克苏柯坪县，是一家集种植养殖、生物研发、生产加工为一体的综合型健康食品企业。

自企业创立之初，优驼便关注全球地标性食材的独特营养，以骆驼产业为核心，逐步完成从源头寻驼、工厂建设、科研合作到品质标准确立的全产业链布局。

## 牧场与奶源
根据企业提供的介绍，优驼在新疆柯坪与木垒布局专属牧场。企业重视源头原料与养殖环节，关注新疆产地条件与奶源管理。

## 在源头建厂
企业坚持“在源头建厂”的理念，结合生产设备与加工技术，围绕奶源收集、冷链运输、生产加工和检验出厂建立管理流程，关注产品品质的稳定性。

## 科研与品质管理
优驼围绕骆驼产业开展生物研发与生产加工，重视检测流程、品质标准和全过程管理。具体认证、专利及检测报告以企业正式资料为准。

## 品牌发展
根据企业介绍，优驼产品已销往新加坡、美国等国家和地区。未来，企业将继续依托新疆地标优势，推动驼奶产业标准化、智能化与国际化发展。

## 关于本文
本文依据客户提供的《优驼企业介绍》整理，用于企业官网博客的首篇内容展示。涉及销量、产能、认证与新工厂进度的具体数据，待最新资料核实后补充。'''
row=d.execute('SELECT id FROM content WHERE title=?',(title,)).fetchone()
if row:d.execute("UPDATE content SET body=?,summary=?,category=?,status='published' WHERE id=?",(body,'了解优驼的企业起点、牧场布局、源头加工与品牌发展。内容依据企业提供的介绍整理。','企业介绍',row[0]))
else:d.execute("INSERT INTO content(title,body,kind,status,summary,category,cover) VALUES(?,?,'news','published',?,'企业介绍','')",(title,body,'了解优驼的企业起点、牧场布局、源头加工与品牌发展。内容依据企业提供的介绍整理。'))
d.commit();ident=d.execute('SELECT id FROM content WHERE title=?',(title,)).fetchone()[0];print('Published enterprise introduction: /news/'+str(ident))
