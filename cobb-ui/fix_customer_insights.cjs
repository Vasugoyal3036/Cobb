const fs = require('fs');
let c = fs.readFileSync('src/components/tabs/CustomerInsightsTab.jsx', 'utf8').split('\n');

const missingContent = `                                    customer.loyaltyTier === 'Platinum' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    customer.loyaltyTier === 'Gold' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    customer.loyaltyTier === 'Silver' ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                    'bg-orange-100 text-orange-700 border border-orange-200'
                                  }\`}>
                                    <Crown className="w-3 h-3" /> {customer.loyaltyTier}
                                  </span>
                                  {customer.nextTier && (
                                    <p className="text-[9px] text-slate-400 mt-0.5 font-normal">
                                      ₹{formatCurrency(customer.spendToNextTier)} to {customer.nextTier}
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {activeTab === 'vip' 
                                ? <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">{customer.TotalBills} Invoices</span>
                                : <span className="text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg text-sm border border-red-100">{customer.DaysSinceLastVisit} Days</span>
                              }
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <span className="inline-flex items-center text-xs text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1.5 rounded-lg">
                                Open Profile &rarr;
                              </span>
                            </td>`;

c.splice(114, 0, missingContent);
fs.writeFileSync('src/components/tabs/CustomerInsightsTab.jsx', c.join('\n'));
console.log("Fixed CustomerInsightsTab");
