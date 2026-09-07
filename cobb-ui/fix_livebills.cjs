const fs = require('fs');

const file = 'd:\\cobbbb\\cobb-ui\\src\\components\\tabs\\LiveBillsTab.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Keep up to line 105
let cleanLines = lines.slice(0, 105);

const appended = `                                          <tr>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Item</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Color</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 whitespace-nowrap">Size</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 text-right whitespace-nowrap">Qty</th>
                                            <th className="px-4 py-2 text-xs font-bold text-slate-500 text-right whitespace-nowrap">Price</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {billItemsCache[bill.BillId].map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                              <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                  <span>{item.ArticleName}</span>
                                                  <span className="text-xs text-slate-400 font-mono">{item.ArticleNo}</span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{item.Color}</td>
                                              <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{item.Size}</td>
                                              <td className="px-4 py-2.5 text-slate-700 font-bold text-right whitespace-nowrap">{item.Quantity}</td>
                                              <td className="px-4 py-2.5 text-slate-700 text-right whitespace-nowrap">{formatCurrency(item.NetPrice)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-500 italic">No item details available.</div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      {liveBills.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-16 text-center text-slate-400 font-medium">
                            <Receipt className="w-10 h-10 mb-3 text-slate-300 mx-auto" />
                            No invoices processed today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

    </>
  );
};

export default LiveBillsTab;
`;

fs.writeFileSync(file, cleanLines.join('\n') + '\n' + appended);
console.log("Fixed LiveBillsTab.jsx");
