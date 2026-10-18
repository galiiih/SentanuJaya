<?php

use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\{
    UomController,
    CompanyController,
    BranchController,
    ColorController,
    TreatmentController,
    ExpenseCategoryController,
    PaymentMethodController,
    TransportTemplateController,
    ProductionStatusController,
    WorkerController,
    SupplierController,
    MaterialController,
    CustomerController,
    CustomerContactController,
    CustomerItemController,
    PriceListController,
    PriceListLineController,
    GoodsReceiptController,
    CustodyController,
    AuthController,
    DeliveryOrderController,
    AcceptanceController,
    CustomerPoController,
    InvoiceController,
    PaymentController,
    DashboardController,
    ReportController,
    WarehouseController,
    MaterialReceiptController,
    MaterialUsageController,
    StockController,
    WorkOrderController,
};

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware([StartSession::class, 'throttle:5,1']);

    Route::middleware([StartSession::class, 'auth'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // Master Data (Protected by Auth)
        Route::apiResource('uoms', UomController::class);
        Route::apiResource('companies', CompanyController::class);
        Route::apiResource('branches', BranchController::class);
        Route::apiResource('colors', ColorController::class);
        Route::apiResource('treatments', TreatmentController::class);
        Route::apiResource('expense-categories', ExpenseCategoryController::class);
        Route::apiResource('payment-methods', PaymentMethodController::class);
        Route::apiResource('transport-templates', TransportTemplateController::class);
        Route::apiResource('production-statuses', ProductionStatusController::class);
        Route::apiResource('workers', WorkerController::class);
        Route::apiResource('suppliers', SupplierController::class);
        Route::apiResource('materials', MaterialController::class);
        Route::apiResource('customers', CustomerController::class);
        Route::apiResource('customer-contacts', CustomerContactController::class);
        Route::apiResource('customer-items', CustomerItemController::class);
        Route::apiResource('price-lists', PriceListController::class);
        Route::apiResource('price-list-lines', PriceListLineController::class);
        Route::get('custody-locations', [CustodyController::class, 'locations']);
        Route::get('custody-balances', [CustodyController::class, 'balances']);
        Route::get('custody-ledger', [CustodyController::class, 'ledger']);
        Route::post('goods-receipts/{goodsReceipt}/submit', [GoodsReceiptController::class, 'submit']);
        Route::post('goods-receipts/{goodsReceipt}/post', [GoodsReceiptController::class, 'post']);
        Route::post('goods-receipts/{goodsReceipt}/cancel', [GoodsReceiptController::class, 'cancel']);
        Route::apiResource('goods-receipts', GoodsReceiptController::class);

        // Phase 4: Customer PO
        Route::post('customer-pos/{customerPo}/activate', [CustomerPoController::class, 'activate']);
        Route::post('customer-pos/{customerPo}/cancel', [CustomerPoController::class, 'cancel']);
        Route::post('customer-pos/{customerPo}/close', [CustomerPoController::class, 'close']);
        Route::apiResource('customer-pos', CustomerPoController::class);

        // Phase 4: Delivery Orders (Surat Jalan)
        Route::post('delivery-orders/{deliveryOrder}/submit', [DeliveryOrderController::class, 'submit']);
        Route::post('delivery-orders/{deliveryOrder}/deliver', [DeliveryOrderController::class, 'deliver']);
        Route::post('delivery-orders/{deliveryOrder}/cancel', [DeliveryOrderController::class, 'cancel']);
        Route::apiResource('delivery-orders', DeliveryOrderController::class);

        // Phase 4: Customer Acceptance
                Route::post('acceptances/{acceptance}/submit', [AcceptanceController::class, 'submit']);
                Route::post('acceptances/{acceptance}/post', [AcceptanceController::class, 'post']);
                Route::post('acceptances/{acceptance}/cancel', [AcceptanceController::class, 'cancel']);
                Route::apiResource('acceptances', AcceptanceController::class)->except(['update', 'destroy']);

                // Phase 5: Invoice
                Route::get('invoices/eligible-delivery-orders', [InvoiceController::class, 'eligibleDeliveryOrders']);
                Route::post('invoices/{invoice}/post', [InvoiceController::class, 'post']);
                Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
                Route::apiResource('invoices', InvoiceController::class)->except(['update', 'destroy']);

                // Phase 5: Payment
                Route::get('customers/{customer}/outstanding', [PaymentController::class, 'customerOutstanding']);
                Route::apiResource('payments', PaymentController::class)->only(['index', 'store', 'show']);

                // Dashboard Summary
                Route::get('dashboard/summary', [DashboardController::class, 'summary']);

                // Advanced Reporting
                Route::get('reports/financial', [ReportController::class, 'financial']);
                Route::get('reports/receivables', [ReportController::class, 'receivables']);
                Route::get('reports/operational', [ReportController::class, 'operational']);
                Route::get('reports/custody', [ReportController::class, 'custody']);

                // Inventory & Material Module
                Route::apiResource('warehouses', WarehouseController::class);
                Route::post('material-receipts/{materialReceipt}/post', [MaterialReceiptController::class, 'post']);
                Route::post('material-receipts/{materialReceipt}/cancel', [MaterialReceiptController::class, 'cancel']);
                Route::apiResource('material-receipts', MaterialReceiptController::class);
                Route::post('material-usages/{materialUsage}/post', [MaterialUsageController::class, 'post']);
                Route::post('material-usages/{materialUsage}/cancel', [MaterialUsageController::class, 'cancel']);
                Route::apiResource('material-usages', MaterialUsageController::class);
                Route::get('stocks', [StockController::class, 'index']);
                Route::get('stock-movements', [StockController::class, 'movements']);
                Route::get('stocks/low-stock', [StockController::class, 'lowStock']);

                // Work Order & Production Module
                Route::post('work-orders/{workOrder}/post', [WorkOrderController::class, 'post']);
                Route::apiResource('work-orders', WorkOrderController::class);
                Route::post('work-order-lines/{line}/stage-movements', [WorkOrderController::class, 'storeStageMovement']);
                Route::post('work-order-lines/{line}/qc-inspections', [WorkOrderController::class, 'storeQcInspection']);
            });
        });
