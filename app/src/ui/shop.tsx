/* The Shopping tab: travel gear we like, by kind, each with a link to buy it (model/shop.ts). */
import { AMAZON_TAG, PRODUCTS, productLink } from '../model/shop';

export function Shop() {
  const cats = [...new Set(PRODUCTS.map(p => p.cat))];
  return (
    <>
      <h1 className="page-h">Shopping</h1>
      <p className="note" style={{ marginTop: 0 }}>Things we like to travel with.{AMAZON_TAG ? ' Buying through these links may earn WrongTrain a small commission, at no cost to you.' : ''}</p>
      {cats.map(c => (
        <section key={c} className="sec">
          <h3 className="sub-h">{c}</h3>
          <ul className="sheet">{PRODUCTS.filter(p => p.cat === c).map(p => (
            <li key={p.name}>
              <div className="item-h"><span className="item-n">{p.name}</span></div>
              <p className="item-d">{p.why}</p>
              <div className="meta"><a href={productLink(p)} target="_blank" rel="noopener sponsored">Find it</a></div>
            </li>
          ))}</ul>
        </section>
      ))}
    </>
  );
}
