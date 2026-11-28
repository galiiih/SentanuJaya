<?php

namespace App\\Http\\Controllers\\Api\\V1;

use App\\Http\\Controllers\\Api\\BaseApiController;
use App\\Http\\Controllers\\Api\\V1\\{
    BranchController,
    CompanyController,
    CustomerController,
    CustomerContactController,
    CustomerItemController,
    MaterialController,
    PriceListController,
    PriceListLineController,
    SupplierController,
    UomController,
    WarehouseController
};
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Database\\QueryException;
use RuntimeException;

class MasterDataImportController extends BaseApiController
{
    private const RESOURCE_CONTROLLERS = [
        'companies' => CompanyController::class,
        'branches' => BranchController::class,
        'customers' => CustomerController::class,
        'customer_contacts' => CustomerContactController::class,
        'customer_items' => CustomerItemController::class,
        'price_lists' => PriceListController::class,
        'price_list_lines' => PriceListLineController::class,
        'uoms' => UomController::class,
        'materials' => MaterialController::class,
        'warehouses' => WarehouseController::class,
        'suppliers' => SupplierController::class,
    ];

    /**
     * Import a batch through each resource's existing store() validation.
     * The entire batch is committed only when every row succeeds.
     */
    public function store(Request $request, string $resource): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('master.manage'), 403, 'Forbidden');

        $controllerClass = self::RESOURCE_CONTROLLERS[$resource] ?? null;
        if (!$controllerClass) {
            return $this->sendError('Unsupported Master Data resource.', [
                'resource' => ['The selected resource cannot be imported.'],
            ], 404);
        }

        $validator = \\Illuminate\\Support\\Facades\\Validator::make($request->all(), [
            'rows' => 'required|array|min:1|max:500',
            'rows.*' => 'required|array',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Invalid import payload.', $validator->errors(), 422);
        }

        try {
            $created = DB::transaction(function () use ($request, $controllerClass): array {
                $ids = [];

                foreach ($request->input('rows') as $index => $row) {
                    $rowNumber = $index + 2;
                    $rowRequest = Request::create(
                        '/api/v1/' . $request->route('resource'),
                        'POST',
                        $row
                    );
                    $rowRequest->setUserResolver(static fn () => $request->user());

                    try {
                        /** @var JsonResponse $response */
                        $response = app($controllerClass)->store($rowRequest);
                    } catch (QueryException $exception) {
                        throw new MasterDataImportRowException(
                            $rowNumber,
                            ['database' => ['Data melanggar aturan unik atau relasi database.']],
                            $exception
                        );
                    }

                    $body = $response->getData(true);
                    if ($response->getStatusCode() >= 400 || ($body['success'] ?? true) === false) {
                        throw new MasterDataImportRowException(
                            $rowNumber,
                            $body['errors'] ?? ['row' => [$body['message'] ?? 'Validasi gagal.']]
                        );
                    }

                    $id = data_get($body, 'data.id');
                    if ($id !== null) {
                        $ids[] = $id;
                    }
                }

                return $ids;
            }, 1);
        } catch (MasterDataImportRowException $exception) {
            return $this->sendError(
                'Import dibatalkan pada baris ' . $exception->rowNumber . '. Tidak ada data yang disimpan.',
                [
                    'row' => $exception->rowNumber,
                    'details' => $exception->errors,
                ],
                422
            );
        }

        return $this->sendResponse([
            'resource' => $resource,
            'created_count' => count($created),
            'ids' => $created,
        ], 'Master Data imported successfully.', 201);
    }
}

class MasterDataImportRowException extends RuntimeException
{
    public function __construct(
        public readonly int $rowNumber,
        public readonly array $errors,
        ?\\Throwable $previous = null
    ) {
        parent::__construct('Master Data import row failed.', 0, $previous);
    }
}
